// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Agent Plaza
/// @notice Alun-alun on-chain khusus pemegang Agent ID.
/// @dev Hanya 1 kontrak, tanpa owner, tanpa token, tanpa kustodi, tanpa server.
///  - Akses (check-in, posting, tip, vouch) HANYA untuk alamat yang balanceOf > 0
///    di kontrak Agent ID 0x60b9262456de011f7d15a54cdd8c48baaa8b022f (SPACE ID, ERC-721, non-transferable).
///  - Tip diteruskan 100% langsung ke penerima, tanpa fee, tanpa ditahan.
///  - Tidak ada fungsi withdraw, pause, freeze, mint, ubah tax, atau tarik dana user.
///  - Tidak ada admin/owner sama sekali: semua parameter adalah konstanta.
///    Kalau ada bug, solusinya deploy kontrak baru — bukan upgrade diam-diam.
///  - Tidak ada pengumpulan seed phrase / private key / pairing code / sesi login.
///  - Frontend TIDAK memakai QR Agentic Wallet. Connect wallet biasa saja.
interface IAgentID {
    function balanceOf(address owner) external view returns (uint256);
}

contract AgentPlaza {
    // ------------------------------------------------------------------
    // Konstanta (bukan variabel owner — tidak bisa diubah siapa pun)
    // ------------------------------------------------------------------
    IAgentID public immutable agentId;

    /// @notice Panjang pesan maksimal, dalam byte (UTF-8). 280 karakter ASCII ~ 280 byte.
    uint256 public constant MAX_MESSAGE_LENGTH = 280;
    /// @notice Jeda minimal antar posting per alamat, detik. Anti-spam sederhana.
    uint256 public constant POST_COOLDOWN = 60;
    /// @notice Kuota Founding 30: 30 holder pertama yang check-in.
    uint256 public constant FOUNDING_LIMIT = 30;
    /// @notice Maksimal pesan yang bisa dibaca dalam 1 panggilan getMessages.
    uint256 public constant MAX_READ = 50;

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------
    struct Message {
        address poster;
        string text;
        uint256 timestamp;
        uint256 day; // nomor hari UTC: block.timestamp / 1 days
    }

    Message[] public messages;

    mapping(address => uint256) public lastCheckInDay;
    mapping(address => uint256) public currentStreak;
    mapping(address => uint256) public longestStreak;
    mapping(address => uint256) public totalCheckIns;
    mapping(address => uint256) public lastPostAt;
    mapping(address => uint256) public tipsReceived; // wei
    mapping(address => uint256) public tipsReceivedCount;
    mapping(address => uint256) public vouchesReceived;
    mapping(address => mapping(address => bool)) public hasVouched;
    mapping(address => bool) public isFounder;
    mapping(address => bool) public hasInteracted;

    address[] public interactors;

    uint256 public founderCount;
    uint256 public totalHoldersInteracted;

    // Reentrancy guard minimal (tanpa OpenZeppelin, supaya standalone).
    uint256 private _locked = 1;

    // ------------------------------------------------------------------
    // Event — semua aksi penting di-emit agar mudah dibaca on-chain
    // (dan agar ranking on-chain bisa menghitung interaksi).
    // ------------------------------------------------------------------
    event CheckedIn(address indexed user, uint256 indexed day, uint256 streak, bool isFounder);
    event MessagePosted(address indexed poster, uint256 indexed messageId, string text, uint256 timestamp);
    event Tipped(address indexed from, address indexed to, uint256 amount);
    event Vouched(address indexed from, address indexed to, uint256 totalVouches);

    // ------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------
    constructor(address agentIdAddress) {
        require(agentIdAddress != address(0), "AgentPlaza: Agent ID address zero");
        agentId = IAgentID(agentIdAddress);
    }

    // ------------------------------------------------------------------
    // Modifier & internal
    // ------------------------------------------------------------------
    modifier onlyHolder() {
        require(agentId.balanceOf(msg.sender) > 0, "AgentPlaza: Agent ID required");
        _;
    }

    modifier nonReentrant() {
        require(_locked == 1, "AgentPlaza: reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    function _markInteracted(address user) internal {
        if (!hasInteracted[user]) {
            hasInteracted[user] = true;
            interactors.push(user);
            totalHoldersInteracted += 1;
        }
    }

    function _currentDay() internal view returns (uint256) {
        return block.timestamp / 1 days;
    }

    // ------------------------------------------------------------------
    // 1. Check-in harian
    // ------------------------------------------------------------------
    /// @notice Check-in 1x per hari UTC. Streak +1 kalau kemarin juga check-in,
    ///  reset ke 1 kalau bolos sehari. 30 holder pertama jadi Founder permanen.
    function checkIn() external onlyHolder {
        uint256 day = _currentDay();
        require(lastCheckInDay[msg.sender] != day, "AgentPlaza: already checked in today");

        uint256 newStreak;
        if (lastCheckInDay[msg.sender] == day - 1) {
            newStreak = currentStreak[msg.sender] + 1;
        } else {
            newStreak = 1;
        }
        currentStreak[msg.sender] = newStreak;
        if (newStreak > longestStreak[msg.sender]) {
            longestStreak[msg.sender] = newStreak;
        }
        lastCheckInDay[msg.sender] = day;
        totalCheckIns[msg.sender] += 1;

        bool founder = false;
        if (!isFounder[msg.sender] && founderCount < FOUNDING_LIMIT) {
            isFounder[msg.sender] = true;
            founderCount += 1;
            founder = true;
        }

        _markInteracted(msg.sender);
        emit CheckedIn(msg.sender, day, newStreak, founder);
    }

    // ------------------------------------------------------------------
    // 2. Wall pesan
    // ------------------------------------------------------------------
    /// @notice Posting pesan pendek ke wall. Hanya holder, max 280 byte, cooldown 60 detik.
    function postMessage(string calldata text) external onlyHolder {
        uint256 len = bytes(text).length;
        require(len > 0, "AgentPlaza: empty message");
        require(len <= MAX_MESSAGE_LENGTH, "AgentPlaza: message too long");
        require(
            block.timestamp >= lastPostAt[msg.sender] + POST_COOLDOWN,
            "AgentPlaza: post cooldown, wait 60s"
        );

        lastPostAt[msg.sender] = block.timestamp;
        messages.push(
            Message({poster: msg.sender, text: text, timestamp: block.timestamp, day: _currentDay()})
        );

        _markInteracted(msg.sender);
        emit MessagePosted(msg.sender, messages.length - 1, text, block.timestamp);
    }

    // ------------------------------------------------------------------
    // 3. Tip langsung (tanpa fee, tanpa kustodi)
    // ------------------------------------------------------------------
    /// @notice Kirim BNB langsung ke holder lain. 100% diteruskan, 0 fee.
    ///  Checks-effects-interactions + nonReentrant: state di-update SEBELUM call.
    ///  Penerima harus holder juga, bukan diri sendiri, bukan alamat nol.
    function tip(address payable recipient) external payable onlyHolder nonReentrant {
        require(msg.value > 0, "AgentPlaza: tip amount zero");
        require(recipient != address(0), "AgentPlaza: recipient zero");
        require(recipient != msg.sender, "AgentPlaza: cannot tip yourself");
        require(agentId.balanceOf(recipient) > 0, "AgentPlaza: recipient must hold Agent ID");

        tipsReceived[recipient] += msg.value;
        tipsReceivedCount[recipient] += 1;
        _markInteracted(msg.sender);

        (bool ok, ) = recipient.call{value: msg.value}("");
        require(ok, "AgentPlaza: tip transfer failed");

        emit Tipped(msg.sender, recipient, msg.value);
    }

    // ------------------------------------------------------------------
    // 4. Vouch (1x per target, hanya holder)
    // ------------------------------------------------------------------
    /// @notice Vouch 1x untuk 1 holder lain. Tidak bisa vouch diri sendiri / 2x.
    function vouch(address target) external onlyHolder {
        require(target != address(0), "AgentPlaza: target zero");
        require(target != msg.sender, "AgentPlaza: cannot vouch yourself");
        require(agentId.balanceOf(target) > 0, "AgentPlaza: target must hold Agent ID");
        require(!hasVouched[msg.sender][target], "AgentPlaza: already vouched");

        hasVouched[msg.sender][target] = true;
        vouchesReceived[target] += 1;

        _markInteracted(msg.sender);
        emit Vouched(msg.sender, target, vouchesReceived[target]);
    }

    // ------------------------------------------------------------------
    // View: reputasi & daftar
    // ------------------------------------------------------------------
    /// @notice Skor reputasi (view saja, bukan token, bukan hadiah):
    ///  streak saat ini x10 + total check-in x5 + vouch diterima x20 + jumlah tip diterima x15.
    ///  Founder tidak menambah skor — badge terpisah, bukan keunggulan angka.
    function getReputation(address user)
        external
        view
        returns (
            uint256 score,
            uint256 streak,
            uint256 total,
            uint256 longest,
            uint256 tipsWei,
            uint256 tipsCount,
            uint256 vouches,
            bool founder
        )
    {
        streak = currentStreak[user];
        total = totalCheckIns[user];
        longest = longestStreak[user];
        tipsWei = tipsReceived[user];
        tipsCount = tipsReceivedCount[user];
        vouches = vouchesReceived[user];
        founder = isFounder[user];
        score = streak * 10 + total * 5 + vouches * 20 + tipsCount * 15;
    }

    function isHolder(address user) external view returns (bool) {
        return agentId.balanceOf(user) > 0;
    }

    function messageCount() external view returns (uint256) {
        return messages.length;
    }

    function interactorCount() external view returns (uint256) {
        return interactors.length;
    }

    /// @notice Baca pesan dengan paginasi. limit dibatasi MAX_READ (50).
    function getMessages(uint256 offset, uint256 limit) external view returns (Message[] memory) {
        require(limit > 0 && limit <= MAX_READ, "AgentPlaza: limit 1-50");
        uint256 total = messages.length;
        if (offset >= total) {
            return new Message[](0);
        }
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 n = end - offset;
        Message[] memory out = new Message[](n);
        for (uint256 i = 0; i < n; i++) {
            out[i] = messages[offset + i];
        }
        return out;
    }

    /// @notice Baca daftar alamat yang pernah berinteraksi (untuk board reputasi).
    function getInteractors(uint256 offset, uint256 limit) external view returns (address[] memory) {
        require(limit > 0 && limit <= MAX_READ, "AgentPlaza: limit 1-50");
        uint256 total = interactors.length;
        if (offset >= total) {
            return new address[](0);
        }
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 n = end - offset;
        address[] memory out = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            out[i] = interactors[offset + i];
        }
        return out;
    }
}
