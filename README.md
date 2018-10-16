# FriendsFingers Smart Contracts

[![Build Status](https://travis-ci.org/FriendsFingers/friendsfingers-smartcontracts.svg?branch=master)](https://travis-ci.org/FriendsFingers/friendsfingers-smartcontracts)
[![Coverage Status](https://coveralls.io/repos/github/friendsfingers/friendsfingers-smartcontracts/badge.svg?branch=master)](https://coveralls.io/github/friendsfingers/friendsfingers-smartcontracts?branch=master)

The source code for FriendsFingers Smart Contracts. 
 
Live here [https://www.friendsfingers.com](https://www.friendsfingers.com/)

FriendsFingers helps startups and small businesses to start a trustworthy Crowdsale on Ethereum blockchain with no setup costs and zero lines of code required. 


 
## Installation


Install truffle.

```bash
npm install -g truffle      // Version 4.1.13+ required.
```



## Install dependencies


```bash
npm install
```



## Linter


Use Solium

```bash
npm run lint:sol
```

Lint and fix all

```bash
npm run lint:all:fix
```



## Compile and test the contracts.
 

Open the Truffle console

```bash
truffle develop
```

Compile 

```bash
compile 
```

Test

```bash
test
```



## Optional

Install the [truffle-flattener](https://github.com/alcuadrado/truffle-flattener)

```bash
npm install -g truffle-flattener
```
 
Usage 
 
```bash
truffle-flattener contracts/FriendsFingersBuilder.sol >> dist/FriendsFingersBuilder.sol
truffle-flattener contracts/crowdsale/FriendsFingersCrowdsale.sol >> dist/FriendsFingersCrowdsale.sol
truffle-flattener contracts/token/FriendsFingersToken.sol >> dist/FriendsFingersToken.sol  
```


## Deployed Smart Contracts

[FriendsFingersBuilder](https://etherscan.io/address/0xf01eab46ade80e599209681a5aaa13260ae8735c) 

[FriendsFingersToken](https://etherscan.io/token/0x3e47d6d9c8c458302ee5aec3f0ae6df9b3ad8f2f)

[FriendsFingersCrowdsale](https://etherscan.io/address/0xa5f5f3803f6174c94f71419834ab91dd2eb7963a) (Round 1) 



## Helpful Links
 
Solidity [Doc](https://solidity.readthedocs.io) [Github](https://solidity.readthedocs.io)

OpenZeppelin [Doc](https://openzeppelin.org/api/docs/open-zeppelin.html) [Github](https://github.com/OpenZeppelin)

Truffle [Doc](http://truffleframework.com/docs) [Github](https://github.com/trufflesuite/truffle)

Web3.js [Doc 0.20.6](https://github.com/ethereum/wiki/wiki/JavaScript-API) [Doc 1.0](http://web3js.readthedocs.io/en/1.0) [Github](https://github.com/ethereum/web3.js)



## Bugs and Issues

Have a bug? [Open a new issue](https://github.com/FriendsFingers/friendsfingers-smartcontracts/issues).



## Copyright and License

Copyright 2018 FriendsFingers. Code released under the [MIT](https://github.com/friendsfingers/friendsfingers-smartcontracts/blob/master/LICENSE) license.
