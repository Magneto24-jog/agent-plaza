// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockAgentID
/// @notice HANYA UNTUK TEST LOKAL. Bukan bagian dari submission.
///  Meniru satu fungsi Agent ID asli yang dipakai AgentPlaza: balanceOf.
///  JANGAN deploy file ini ke mainnet / BSC.
contract MockAgentID {
    mapping(address => uint256) private _balances;

    event Minted(address indexed to);

    function mint(address to) external {
        require(to != address(0), "MockAgentID: zero address");
        _balances[to] += 1;
        emit Minted(to);
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }
}
