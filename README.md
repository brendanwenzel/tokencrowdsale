# ERC20 Token and Crowdsale Template

The token contract has a few special features to it. 

The owner has the ability to pull out any tokens or ether sent to the contract on accident. There are no fees, so there should never be tokens in the contract.

The other major feature is not allowing anyone to make two swaps in a single block. This should keep bots relatively less active.

The crowdsale contract is simple. It allows people to purchase a token with caps on individual and total raised.

When finalized, the contract will send the ether to the owner and the tokens to the buyers.
