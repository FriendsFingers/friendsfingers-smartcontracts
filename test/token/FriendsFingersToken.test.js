const { assertRevert } = require('../helpers/assertRevert');

const { shouldBehaveLikeTokenRecover } = require('eth-token-recover/test/TokenRecover.behaviour');
const { shouldBehaveLikeERC1363BasicToken } = require('erc-payable-token/test/token/ERC1363/ERC1363BasicToken.behaviour'); // eslint-disable-line max-len
const { shouldBehaveLikeMintableToken } = require('openzeppelin-solidity/test/token/ERC20/MintableToken.behaviour');
const { shouldBehaveLikeBurnableToken } = require('openzeppelin-solidity/test/token/ERC20/BurnableToken.behaviour');

const { shouldBehaveLikeDetailedERC20Token } = require('./ERC20/DetailedERC20.behaviour');
const { shouldBehaveLikeStandardToken } = require('./ERC20/StandardToken.behaviour');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const FriendsFingersToken = artifacts.require('FriendsFingersToken');

contract('FriendsFingersToken', function ([owner, anotherAccount, recipient, thirdParty]) {
  const _name = 'Shaka';
  const _symbol = 'Hak';
  const _decimals = 18;

  const minter = owner;

  beforeEach(async function () {
    this.token = await FriendsFingersToken.new(_name, _symbol, _decimals, { from: owner });
  });

  context('like a DetailedERC20 token', function () {
    shouldBehaveLikeDetailedERC20Token(_name, _symbol, _decimals);
  });

  context('like a MintableToken', function () {
    shouldBehaveLikeMintableToken([owner, anotherAccount, minter]);
  });

  context('like a BurnableToken', function () {
    const initialBalance = 1000;

    beforeEach(async function () {
      await this.token.mint(owner, initialBalance, { from: minter });
    });
    shouldBehaveLikeBurnableToken([owner], initialBalance);
  });

  context('like a StandardToken', function () {
    const initialBalance = 1000;

    beforeEach(async function () {
      await this.token.mint(owner, initialBalance, { from: minter });
      await this.token.finishMinting({ from: owner });
    });
    shouldBehaveLikeStandardToken([owner, anotherAccount, recipient], initialBalance);
  });

  context('like a ERC1363BasicToken', function () {
    const initialBalance = 1000;

    beforeEach(async function () {
      await this.token.mint(owner, initialBalance, { from: minter });
      await this.token.finishMinting({ from: owner });
    });
    shouldBehaveLikeERC1363BasicToken([owner, anotherAccount, recipient], initialBalance);
  });

  context('like a BaseToken token', function () {
    const initialBalance = 1000;

    beforeEach(async function () {
      await this.token.mint(owner, initialBalance, { from: minter });
    });

    it('should fail transfer before finish minting', async function () {
      await assertRevert(this.token.transfer(owner, initialBalance, { from: owner }));
    });

    it('should fail transferFrom before finish minting', async function () {
      await this.token.approve(anotherAccount, initialBalance, { from: owner });
      await assertRevert(this.token.transferFrom(owner, recipient, initialBalance, { from: anotherAccount }));
    });
  });

  context('like a FriendsFingersToken token', function () {
    it('builder should be token creator', async function () {
      (await this.token.builder()).should.be.equal(owner);
    });
  });

  context('like a TokenRecover', function () {
    beforeEach(async function () {
      this.instance = this.token;
    });

    shouldBehaveLikeTokenRecover([owner, thirdParty]);
  });
});
