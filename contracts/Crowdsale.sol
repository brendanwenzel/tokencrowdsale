// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function getOwner() external view returns (address);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address _owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function getLpPair() external view returns (address);
}


contract Crowdsale {

  IERC20 public token;
  address payable public owner;
  address[] public contributors;
  uint256 public tokensPerETH;
  uint256 public weiRaised;
  uint256 public weiToGoal;
  uint256 public constant contributionCap = 1*10**18; // .5 ETH Individual Wallet Cap
  uint256 public constant cap = 10*10**18; // 10 ETH Hard Cap
  bool private _finalized;
  bool private _notEntered;
  mapping(address => uint256) public tokenBalance;
  mapping(address => uint256) public contributions;

  modifier nonReentrant() {
    require(_notEntered);
    _notEntered = false;
    _;
    _notEntered = true;
  }

  modifier onlyOwner() {
    require(msg.sender == owner, "You are not the owner");
    _;
  }

  event TokenPurchase(
    address indexed purchaser,
    uint256 value,
    uint256 amount
  );

  event CrowdsaleFinalized();

  constructor(uint256 _rate, address payable _wallet, IERC20 _token) {
    require(_rate > 0);
    require(_wallet != address(0));

    tokensPerETH = _rate;
    owner = _wallet;
    token = _token;
    _notEntered = true;
    _finalized = false;
    weiToGoal = cap;
  }

  receive() external payable {
    buyTokens();
  }
  
  fallback() external payable {
    buyTokens();
  }

  function buyTokens() public nonReentrant payable {
    address _beneficiary = msg.sender;
    uint256 weiAmount = msg.value;
    _preValidatePurchase(_beneficiary, weiAmount);
    uint256 tokens = _getTokenAmount(weiAmount);
    weiRaised += weiAmount;

    emit TokenPurchase(
      msg.sender,
      weiAmount,
      tokens
    );
    _updatePurchasingState(_beneficiary, weiAmount, tokens);
    _postValidatePurchase(_beneficiary);
  }

  function _preValidatePurchase(
    address _beneficiary,
    uint256 _weiAmount
  )
    internal view
  {
    require(_beneficiary != address(0));
    require(_weiAmount != 0);
    require(weiRaised + _weiAmount <= cap, "Purchase exceeds the hard cap");
    require(contributions[_beneficiary] + _weiAmount <= contributionCap, "Only Allowed to Buy .5ETH");
    require(token.balanceOf(address(this)) != 0, "Presale has not been funded yet");
  }

  function _postValidatePurchase(
    address _beneficiary
  )
    internal view
  {
    require(contributions[_beneficiary] <= contributionCap, "Only Allowed to Buy .5ETH");
    require(weiRaised <= cap, "Purchase exceeds the hard cap");
  }

  function _updatePurchasingState(
    address _beneficiary,
    uint256 _weiAmount,
    uint256 _tokens
  )
    internal
  {
    if (contributions[_beneficiary] == 0){
    contributors.push(_beneficiary);
    }
    contributions[_beneficiary] += _weiAmount;
    tokenBalance[_beneficiary] += _tokens;
    weiToGoal -= _weiAmount;
  }

  function _getTokenAmount(uint256 _weiAmount)
    internal view returns (uint256)
  {
    return _weiAmount * tokensPerETH;
  }

  function finalizeCrowdsale() public onlyOwner returns (bool) {
    require(weiRaised == cap, "Cap not reached");
      _finalized = true;

      for (uint i = 0; i < contributors.length; i++) {
      uint tokenAmount = tokenBalance[address(contributors[i])];
      _finalization(address(contributors[i]), tokenAmount);
      owner.transfer(address(this).balance);
      }

      emit CrowdsaleFinalized();
      return true;
  }

  function _finalization(
    address _beneficiary,
    uint256 _tokenAmount
  )
    internal 
  {
    tokenBalance[_beneficiary] = 0;
    token.transfer(_beneficiary, _tokenAmount);
  }

  function getContributors() public view returns (uint) {
    return contributors.length;
  }

}