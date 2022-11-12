/*/////////////////////////////

Development by BrendanWenzel.eth

*//////////////////////////////

// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

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
}

interface IFactoryV2 {
    event PairCreated(address indexed token0, address indexed token1, address lpPair, uint);
    function getPair(address tokenA, address tokenB) external view returns (address lpPair);
    function createPair(address tokenA, address tokenB) external returns (address lpPair);
}

interface IV2Pair {
    function factory() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function sync() external;
}

interface IRouter02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
}

contract Token is IERC20 {
    mapping (address => uint256) private _tOwned;
    mapping (address => bool) lpPairs;
    mapping (address => mapping (address => uint256)) private _allowances;
    uint256 private timeSinceLastPair = 0;
    address private _owner;
   
    uint256 constant private startingSupply = 10_000_000;
    string constant private _name = "New Test Token";
    string constant private _symbol = "TOKEN";
    uint8 constant private _decimals = 18;
    uint256 constant private _tTotal = startingSupply * 10**_decimals;

    uint private _holders;
    IRouter02 constant private _DEX_ROUTER = IRouter02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    address private _lpPair;
    address constant public DEAD = 0x000000000000000000000000000000000000dEaD;
    address payable public deployer;

    mapping (address => uint256) public lastTrade;

    constructor () payable {
        _owner = msg.sender;
        deployer = payable(msg.sender);

        _tOwned[_owner] = _tTotal;
        _holders += 1;
        emit Transfer(address(0), _owner, _tTotal);

        _lpPair = IFactoryV2(_DEX_ROUTER.factory()).createPair(_DEX_ROUTER.WETH(), address(this));
        lpPairs[_lpPair] = true;

        _approve(_owner, address(_DEX_ROUTER), type(uint256).max);
    }

    receive() external payable {}
    fallback() external payable {}

    modifier onlyOwner() { require(_owner == msg.sender, "Caller =/= owner."); _; }
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function transferOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Call renounceOwnership to transfer owner to the zero address.");
        require(newOwner != DEAD, "Call renounceOwnership to transfer owner to the zero address.");

        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
        
    }

    function renounceOwnership() external onlyOwner {
        address oldOwner = _owner;
        _owner = address(0);
        emit OwnershipTransferred(oldOwner, address(0));
    }

    function totalSupply() external pure override returns (uint256) { if (_tTotal == 0) { revert(); } return _tTotal; }
    function decimals() external pure override returns (uint8) { if (_tTotal == 0) { revert(); } return _decimals; }
    function symbol() external pure override returns (string memory) { return _symbol; }
    function name() external pure override returns (string memory) { return _name; }
    function getOwner() external view override returns (address) { return _owner; }
    function allowance(address holder, address spender) external view override returns (uint256) { return _allowances[holder][spender]; }
    function balanceOf(address account) public view override returns (uint256) {
        return _tOwned[account];
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function _approve(address sender, address spender, uint256 amount) internal {
        require(sender != address(0), "ERC20: Zero Address");
        require(spender != address(0), "ERC20: Zero Address");

        _allowances[sender][spender] = amount;
        emit Approval(sender, spender, amount);
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        if (_allowances[sender][msg.sender] != type(uint256).max) {
            _allowances[sender][msg.sender] -= amount;
        }

        return _transfer(sender, recipient, amount);
    }

    function setLpPair(address pair) external {
            require(msg.sender == deployer, "Can only be called by deployer.");
            if (timeSinceLastPair != 0) {
            require(block.timestamp - timeSinceLastPair > 3 days, "3 Day cooldown.");
            }
            require(!lpPairs[pair], "Pair already added to list.");
            lpPairs[pair] = true;
            timeSinceLastPair = block.timestamp;
    }

    function getLpPair() external view returns (address) {
        return _lpPair;
    }

    function getCirculatingSupply() public view returns (uint256) {
        return (_tTotal - (balanceOf(DEAD) + balanceOf(address(0))));
    }

    function getHolderCount() public view returns (uint) {
        return _holders;
    }

    function _hasLimits(address from, address to) internal view returns (bool) {
        return from != _owner
            && to != _owner
            && tx.origin != _owner
            && from != deployer
            && to != deployer
            && tx.origin != deployer
            && to != DEAD
            && to != address(0)
            && from != address(this);
    }

    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than zero");
        return finalizeTransfer(from, to, amount);
    }

    function sweepContingency() external {
        payable(deployer).transfer(address(this).balance);
    }

    function sweepTokens(address token) external {
        IERC20 TOKEN = IERC20(token);
        TOKEN.transfer(deployer, TOKEN.balanceOf(address(this)));
    }

    function finalizeTransfer(address from, address to, uint256 amount) internal returns (bool) {

        if(_hasLimits(from, to)) {
                if (lpPairs[from]){
                    require(lastTrade[to] != block.number);
                    lastTrade[to] = block.number;
                } else {
                    require(lastTrade[from] != block.number);
                    lastTrade[from] = block.number;
                }
        }
        if (_tOwned[from] - amount == 0) {
            _holders -= 1;
        } else if (_tOwned[to] == 0) {
            _holders += 1;
        }
        _tOwned[from] -= amount;
        _tOwned[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

}