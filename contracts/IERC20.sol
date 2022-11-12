// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

abstract contract IERC20 {
    function totalSupply() external virtual view returns (uint256);
    function decimals() external virtual view returns (uint8);
    function symbol() external virtual view returns (string memory);
    function name() external virtual view returns (string memory);
    function getOwner() external virtual view returns (address);
    function balanceOf(address account) external virtual view returns (uint256);
    function transfer(address recipient, uint256 amount) external virtual returns (bool);
    function allowance(address _owner, address spender) external virtual view returns (uint256);
    function approve(address spender, uint256 amount) external virtual returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external virtual returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}