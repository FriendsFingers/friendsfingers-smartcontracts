# FriendsFingers Smart Contracts

[![Build Status](https://travis-ci.org/FriendsFingers/friendsfingers-smartcontracts.svg?branch=master)](https://travis-ci.org/FriendsFingers/friendsfingers-smartcontracts)
[![Coverage Status](https://coveralls.io/repos/github/FriendsFingers/friendsfingers-smartcontracts/badge.svg?branch=master)](https://coveralls.io/github/FriendsFingers/friendsfingers-smartcontracts?branch=master)

The source code for FriendsFingers Smart Contracts. 
 
Live here [https://www.friendsfingers.com](https://www.friendsfingers.com/)

FriendsFingers helps startups and small businesses to start a trustworthy Crowdsale on Ethereum blockchain with no setup costs and zero lines of code required. 


 
## Installation

Install Truffle and dependencies

```bash
npm install -g truffle     // Version 4.0.6+ required.
npm install -g solc        // Version 0.4.19+ required
npm install
```
 
 
 
## Start Truffle

```bash
truffle develop
```



## Compile and migrate
inside truffle develop
  
```bash
compile 
migrate
```
 
 
 
## Test 
inside truffle develop
  
```bash
test
```


View [test results](https://github.com/FriendsFingers/friendsfingers-smartcontracts/blob/master/test/results/test-results.md)



## Optional


### Flattener


Install the [alcuadrado/truffle-flattener](https://github.com/alcuadrado/truffle-flattener)

```bash
npm install truffle-flattener -g
```
 
Usage 
 
```bash
truffle-flattener contracts/FriendsFingersBuilder.sol >> dist/FriendsFingersBuilder.sol
truffle-flattener contracts/crowdsale/FriendsFingersCrowdsale.sol >> dist/FriendsFingersCrowdsale.sol
truffle-flattener contracts/token/FriendsFingersToken.sol >> dist/FriendsFingersToken.sol  
```


### Linter

Install the [Solium linter](https://github.com/duaraghav8/Solium)

```bash
npm install -g solium
```

Usage

```bash
solium -d contracts
```

## Helpful Links
 
Solidity [Doc](https://solidity.readthedocs.io) [GitHub](https://github.com/ethereum/solidity)
 
Truffle [Doc](http://truffleframework.com/docs/) [GitHub](https://github.com/trufflesuite/truffle)
 
OpenZeppelin [Doc](http://zeppelin-solidity.readthedocs.io) [GitHub](https://github.com/OpenZeppelin)

Web3.js [Doc](http://web3js.readthedocs.io/en/1.0/index.html) [GitHub](https://github.com/ethereum/web3.js/)



## Bugs and Issues

Have a bug? [Open a new issue](https://github.com/friendsfingers/friendsfingers-smartcontracts/issues).



## Copyright and License

Copyright 2018 FriendsFingers. Code released under the [MIT](https://github.com/friendsfingers/friendsfingers-smartcontracts/blob/master/LICENSE) license.
