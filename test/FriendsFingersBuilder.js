import ether from './helpers/ether';
import { advanceBlock } from './helpers/advanceToBlock';
import { increaseTimeTo, duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const FriendsFingersToken = artifacts.require('FriendsFingersToken');
const FriendsFingersCrowdsale = artifacts.require('FriendsFingersCrowdsale');
const FriendsFingersBuilder = artifacts.require('FriendsFingersBuilder');

contract('FriendsFingersBuilder', function ([_, owner, creator, investor, wallet, purchaser, friendsFingersWallet, thirdparty, auxWallet]) {

  const value = ether(1);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function () {
    this.name = "Shaka";
    this.symbol = "HAK";
    this.decimals = 18;

    this.friendsFingersRatePerMille = 50;

    this.startTime = latestTime() + duration.weeks(1);
    this.endTime = this.startTime + duration.weeks(1);
    this.afterEndTime = this.endTime + duration.seconds(1);

    this.cap = ether(3);
    this.lessThanCap = ether(2);

    this.goal = ether(2);
    this.lessThanGoal = ether(1);

    this.rate = new BigNumber(1000);

    this.creatorSupply = new web3.BigNumber(10000 * Math.pow(10, this.decimals));

    this.crowdsaleInfo = JSON.stringify({
      title: "Test Crowdsale",
      description: "Lorem ipsum", //description
      url: "http://xxx", //official url
      logo: "http://yyy" //official logo
    });

    this.builder = await FriendsFingersBuilder.new(friendsFingersWallet, { from: owner });
  });

  describe('creating a valid builder', function () {
    it('should fail with 0x0 wallet address', async function () {
      await FriendsFingersBuilder.new(0x0).should.be.rejectedWith(EVMRevert);
    });

    it('should success with valid wallet address', async function () {
      const builder = await FriendsFingersBuilder.new(friendsFingersWallet).should.be.fulfilled;
      const ffWallet = await builder.friendsFingersWallet();
      ffWallet.should.equal(friendsFingersWallet);
    });
  });

  describe('start a crowdsale', function () {
    beforeEach(async function () {
      const { logs } = await this.builder.startCrowdsale(
        this.name,
        this.symbol,
        this.decimals,
        this.cap,
        this.goal,
        this.creatorSupply,
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        this.crowdsaleInfo,
        { from: creator }
      );

      const event = logs.find(e => e.event === 'CrowdsaleStarted');
      should.exist(event);

      this.crowdsale = FriendsFingersCrowdsale.at(event.args.ffCrowdsale);
      this.token = FriendsFingersToken.at(await this.crowdsale.token());
    });

    it('first crowdsale should start as unpaused', async function () {
      let paused = await this.crowdsale.paused();
      assert.equal(paused, false);
    });

    it('later crowdsale should start as paused', async function () {
      await this.builder.startCrowdsale(
        this.name,
        this.symbol,
        this.decimals,
        this.cap,
        this.goal,
        this.creatorSupply,
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        this.crowdsaleInfo,
        { from: creator }
      );

      const crowdsaleCount = await this.builder.crowdsaleCount();
      this.laterCrowdsale = FriendsFingersCrowdsale.at(await this.builder.crowdsaleList(crowdsaleCount));

      let paused = await this.laterCrowdsale.paused();
      assert.equal(paused, true);
    });

    it('crowdsale wallet should have the initial supply', async function () {
      const creatorSupply = await this.token.balanceOf(wallet);
      creatorSupply.should.be.bignumber.equal(this.creatorSupply);
    });

    it('count should be 1', async function () {
      const crowdsaleCount = await this.builder.crowdsaleCount();
      assert.equal(crowdsaleCount, 1);
    });

    it('crowdsale list should be updated', async function () {
      const crowdsaleCount = await this.builder.crowdsaleCount();
      const crowdsaleAddress = await this.builder.crowdsaleList(crowdsaleCount);
      assert.equal(crowdsaleAddress, this.crowdsale.address);
    });

    it('creator list should be updated', async function () {
      const crowdsaleCreator = await this.builder.crowdsaleCreators(this.crowdsale.address);
      assert.equal(crowdsaleCreator, creator);
    });

    it('crowdsale owner should be builder address', async function () {
      const crowdsaleBuilder = await this.crowdsale.owner();
      assert.equal(crowdsaleBuilder, this.builder.address);
    });

    it('crowdsale should be token owner', async function () {
      const owner = await this.token.owner();
      owner.should.equal(this.crowdsale.address);
    });
  });

  describe('restart crowdsale', function () {
    describe('goal reached' , function (){
      beforeEach(async function () {
        this.startTime = latestTime() + duration.weeks(1);
        this.endTime = this.startTime + duration.weeks(1);
        this.afterStartTime = this.startTime + duration.seconds(1);
        this.afterEndTime = this.endTime + duration.seconds(1);

        const { logs } = await this.builder.startCrowdsale(
          this.name,
          this.symbol,
          this.decimals,
          this.cap,
          this.goal,
          this.creatorSupply,
          this.startTime,
          this.endTime,
          this.rate,
          wallet,
          this.crowdsaleInfo,
          { from: creator }
        );

        const event = logs.find(e => e.event === 'CrowdsaleStarted');

        this.crowdsale = FriendsFingersCrowdsale.at(event.args.ffCrowdsale);
        await increaseTimeTo(this.afterStartTime);
        await this.crowdsale.send(this.goal).should.be.fulfilled;
        await increaseTimeTo(this.afterEndTime);
      });

      it('should fail with rate equal or greater than old rate', async function () {
        this.startTime = latestTime() + duration.weeks(3);
        this.endTime = this.startTime + duration.weeks(1);
        await this.builder.restartCrowdsale(
          this.crowdsale.address,
          this.cap,
          this.startTime,
          this.endTime,
          this.rate,
          this.crowdsaleInfo,
          { from: creator }
        ).should.be.rejectedWith(EVMRevert);

        this.rate = this.rate + 1;
        await this.builder.restartCrowdsale(
          this.crowdsale.address,
          this.cap,
          this.startTime,
          this.endTime,
          this.rate,
          this.crowdsaleInfo,
          { from: creator }
        ).should.be.rejectedWith(EVMRevert);
      });

      it('builder owner should success to restart crowdsale', async function () {
        this.startTime = latestTime() + duration.weeks(3);
        this.endTime = this.startTime + duration.weeks(1);
        this.rate = this.rate - 1;
        await this.builder.restartCrowdsale(
          this.crowdsale.address,
          this.cap,
          this.startTime,
          this.endTime,
          this.rate,
          this.crowdsaleInfo,
          { from: owner }
        ).should.be.fulfilled;
      });

      it('crowdsale creator should success to restart crowdsale', async function () {
        this.startTime = latestTime() + duration.weeks(3);
        this.endTime = this.startTime + duration.weeks(1);
        this.rate = this.rate - 1;
        await this.builder.restartCrowdsale(
          this.crowdsale.address,
          this.cap,
          this.startTime,
          this.endTime,
          this.rate,
          this.crowdsaleInfo,
          { from: creator }
        ).should.be.fulfilled;
      });

      it('any other user should fail to restart crowdsale', async function () {
        this.startTime = latestTime() + duration.weeks(3);
        this.endTime = this.startTime + duration.weeks(1);
        this.rate = this.rate - 1;
        await this.builder.restartCrowdsale(
          this.crowdsale.address,
          this.cap,
          this.startTime,
          this.endTime,
          this.rate,
          this.crowdsaleInfo,
          { from: thirdparty }
        ).should.be.rejectedWith(EVMRevert);
      });

      it('cannot be restarted and then closed', async function () {
        this.startTime = latestTime() + duration.weeks(3);
        this.endTime = this.startTime + duration.weeks(1);
        this.rate = this.rate - 1;
        await this.builder.restartCrowdsale(
          this.crowdsale.address,
          this.cap,
          this.startTime,
          this.endTime,
          this.rate,
          this.crowdsaleInfo,
          { from: creator }
        ).should.be.fulfilled;

        await this.builder.closeCrowdsale(this.crowdsale.address, { from: creator }).should.be.rejectedWith(EVMRevert);
      });

      it('cannot be closed and then restarted', async function () {
        await this.builder.closeCrowdsale(this.crowdsale.address, { from: creator }).should.be.fulfilled;

        this.startTime = latestTime() + duration.weeks(3);
        this.endTime = this.startTime + duration.weeks(1);
        this.rate = this.rate - 1;
        await this.builder.restartCrowdsale(
          this.crowdsale.address,
          this.cap,
          this.startTime,
          this.endTime,
          this.rate,
          this.crowdsaleInfo,
          { from: creator }
        ).should.be.rejectedWith(EVMRevert);
      });

      it('cannot be restarted twice', async function () {
        this.startTime = latestTime() + duration.weeks(3);
        this.endTime = this.startTime + duration.weeks(1);
        this.rate = this.rate - 1;
        await this.builder.restartCrowdsale(
          this.crowdsale.address,
          this.cap,
          this.startTime,
          this.endTime,
          this.rate,
          this.crowdsaleInfo,
          { from: creator }
        ).should.be.fulfilled;

        this.startTime = latestTime() + duration.weeks(3);
        this.endTime = this.startTime + duration.weeks(1);
        this.rate = this.rate - 1;
        await this.builder.restartCrowdsale(
          this.crowdsale.address,
          this.cap,
          this.startTime,
          this.endTime,
          this.rate,
          this.crowdsaleInfo,
          { from: creator }
        ).should.be.rejectedWith(EVMRevert);
      });

      it('cannot be restarted more than 5 times', async function () {
        for (let i = 2; i <= 5; i++) {
          this.startTime = latestTime() + duration.weeks(3);
          this.endTime = this.startTime + duration.weeks(1);
          this.afterEndTime = this.endTime + duration.seconds(1);
          this.rate = this.rate - 1;
          await this.builder.restartCrowdsale(
            this.crowdsale.address,
            this.cap,
            this.startTime,
            this.endTime,
            this.rate,
            this.crowdsaleInfo,
            { from: creator }
          ).should.be.fulfilled;

          const crowdsaleCount = await this.builder.crowdsaleCount();
          this.crowdsale = FriendsFingersCrowdsale.at(await this.builder.crowdsaleList(crowdsaleCount));

          await increaseTimeTo(this.afterEndTime);
        }

        this.startTime = latestTime() + duration.weeks(3);
        this.endTime = this.startTime + duration.weeks(1);
        this.afterEndTime = this.endTime + duration.seconds(1);
        this.rate = this.rate - 1;
        await this.builder.restartCrowdsale(
          this.crowdsale.address,
          this.cap,
          this.startTime,
          this.endTime,
          this.rate,
          this.crowdsaleInfo,
          { from: creator }
        ).should.be.rejectedWith(EVMRevert);
      });

      describe('all values after restart should be right set', async function () {
        beforeEach(async function () {
          this.startTime = latestTime() + duration.weeks(3);
          this.endTime = this.startTime + duration.weeks(1);
          this.rate = this.rate - 1;
          const { logs } = await this.builder.restartCrowdsale(
            this.crowdsale.address,
            this.cap,
            this.startTime,
            this.endTime,
            this.rate,
            this.crowdsaleInfo,
            { from: creator }
          );

          const event = logs.find(e => e.event === 'CrowdsaleStarted');

          this.newCrowdsale = FriendsFingersCrowdsale.at(event.args.ffCrowdsale);
        });

        it('new crowdsale rate should be less than old rate', async function () {
          const rate = await this.crowdsale.rate();
          const newRate = await this.newCrowdsale.rate();
          newRate.should.be.bignumber.lessThan(rate);
        });

        it('new crowdsale wallet should be the same of the old one', async function () {
          const wallet = await this.newCrowdsale.wallet();
          wallet.should.be.equal(await this.crowdsale.wallet());
        });

        it('new crowdsale previous round id should be old crowdsale id', async function () {
          const previous = await this.newCrowdsale.previousRoundId();
          const oldCrowdsaleId = await this.crowdsale.id();
          previous.should.be.bignumber.equal(oldCrowdsaleId);
        });

        it('old crowdsale next round id should be new crowdsale id', async function () {
          const next = await this.crowdsale.nextRoundId();
          const newCrowdsaleId = await this.newCrowdsale.id();
          next.should.be.bignumber.equal(newCrowdsaleId);
        });

        it('new crowdsale goal should be zero', async function () {
          const goal = await this.newCrowdsale.goal();
          goal.should.be.bignumber.equal(0);
        });

        it('new crowdsale round should be old crowdsale round plus one', async function () {
          const oldRound = await this.crowdsale.round();
          const newRound = await this.newCrowdsale.round();
          newRound.should.be.bignumber.equal(oldRound.toNumber() + 1);
        });

      });
    });

    describe('goal not reached' , function (){
      beforeEach(async function () {
        this.startTime = latestTime() + duration.weeks(1);
        this.endTime = this.startTime + duration.weeks(1);
        this.afterEndTime = this.endTime + duration.seconds(1);

        const { logs } = await this.builder.startCrowdsale(
          this.name,
          this.symbol,
          this.decimals,
          this.cap,
          this.goal,
          this.creatorSupply,
          this.startTime,
          this.endTime,
          this.rate,
          wallet,
          this.crowdsaleInfo,
          { from: creator }
        );

        const event = logs.find(e => e.event === 'CrowdsaleStarted');

        this.crowdsale = FriendsFingersCrowdsale.at(event.args.ffCrowdsale);
      });

      it('should fail to restart crowdsale', async function () {
        this.startTime = latestTime() + duration.weeks(3);
        this.endTime = this.startTime + duration.weeks(1);
        this.rate = this.rate - 1;
        await this.builder.restartCrowdsale(
          this.crowdsale.address,
          this.cap,
          this.startTime,
          this.endTime,
          this.rate,
          this.crowdsaleInfo
        ).should.be.rejectedWith(EVMRevert);
      });

    });

  });

  describe('close crowdsale', function () {
    beforeEach(async function () {
      this.startTime = latestTime() + duration.weeks(1);
      this.endTime = this.startTime + duration.weeks(1);
      this.afterEndTime = this.endTime + duration.seconds(1);

      const { logs } = await this.builder.startCrowdsale(
        this.name,
        this.symbol,
        this.decimals,
        this.cap,
        this.goal,
        this.creatorSupply,
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        this.crowdsaleInfo,
        { from: creator }
      );

      const event = logs.find(e => e.event === 'CrowdsaleStarted');

      this.crowdsale = FriendsFingersCrowdsale.at(event.args.ffCrowdsale);
      await increaseTimeTo(this.afterEndTime);
    });

    it('builder owner should success to close crowdsale', async function () {
      await this.builder.closeCrowdsale(this.crowdsale.address, { from: owner }).should.be.fulfilled;
    });

    it('crowdsale creator should success to close crowdsale', async function () {
      await this.builder.closeCrowdsale(this.crowdsale.address, { from: creator }).should.be.fulfilled;
    });

    it('any other user should fail to close crowdsale', async function () {
      await this.builder.closeCrowdsale(this.crowdsale.address, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
    });

    it('should close minting and transfer token ownership', async function () {
      this.token = FriendsFingersToken.at(await this.crowdsale.token());

      const crowdsaleCreator = await this.builder.crowdsaleCreators(this.crowdsale.address);
      assert.equal(await this.token.mintingFinished(), false);

      await this.builder.closeCrowdsale(this.crowdsale.address, { from: creator });

      assert.equal(await this.token.mintingFinished(), true);
      const postTokenOwner = await this.token.owner();
      postTokenOwner.should.be.equal(crowdsaleCreator);
    });

  });

  describe('paused', function () {
    it('should fail to start crowdsale if paused and then success if unpaused', async function () {
      await this.builder.pause({ from: owner });
      await this.builder.startCrowdsale(
        this.name,
        this.symbol,
        this.decimals,
        this.cap,
        this.goal,
        this.creatorSupply,
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        this.crowdsaleInfo,
        { from: creator }
      ).should.be.rejectedWith(EVMRevert);

      await this.builder.unpause({ from: owner });
      const { logs } = await this.builder.startCrowdsale(
        this.name,
        this.symbol,
        this.decimals,
        this.cap,
        this.goal,
        this.creatorSupply,
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        this.crowdsaleInfo,
        { from: creator }
      );

      const event = logs.find(e => e.event === 'CrowdsaleStarted');
      should.exist(event);
    });

    it('should fail to restart crowdsale if paused and then success if unpaused', async function () {
      this.startTime = latestTime() + duration.weeks(1);
      this.endTime = this.startTime + duration.weeks(1);
      this.afterStartTime = this.startTime + duration.seconds(1);
      this.afterEndTime = this.endTime + duration.seconds(1);

      const { logs } = await this.builder.startCrowdsale(
        this.name,
        this.symbol,
        this.decimals,
        this.cap,
        this.goal,
        this.creatorSupply,
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        this.crowdsaleInfo,
        { from: creator }
      );

      const event = logs.find(e => e.event === 'CrowdsaleStarted');

      this.crowdsale = FriendsFingersCrowdsale.at(event.args.ffCrowdsale);
      await increaseTimeTo(this.afterStartTime);
      await this.crowdsale.send(this.goal).should.be.fulfilled;
      await increaseTimeTo(this.afterEndTime);

      this.startTime = latestTime() + duration.weeks(3);
      this.endTime = this.startTime + duration.weeks(1);
      this.rate = this.rate - 1;

      await this.builder.pause({ from: owner });
      await this.builder.restartCrowdsale(
        this.crowdsale.address,
        this.cap,
        this.startTime,
        this.endTime,
        this.rate,
        this.crowdsaleInfo,
        { from: creator }
      ).should.be.rejectedWith(EVMRevert);

      await this.builder.unpause({ from: owner });
      await this.builder.restartCrowdsale(
        this.crowdsale.address,
        this.cap,
        this.startTime,
        this.endTime,
        this.rate,
        this.crowdsaleInfo,
        { from: creator }
      ).should.be.fulfilled;
    });
  });

  describe('utilities for crowdsale', function () {
    beforeEach(async function () {
      this.startTime = latestTime() + duration.weeks(1);
      this.endTime = this.startTime + duration.weeks(1);
      this.afterEndTime = this.endTime + duration.seconds(1);

      const { logs } = await this.builder.startCrowdsale(
        this.name,
        this.symbol,
        this.decimals,
        this.cap,
        this.goal,
        this.creatorSupply,
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        this.crowdsaleInfo,
        { from: creator }
      );

      const event = logs.find(e => e.event === 'CrowdsaleStarted');

      this.crowdsale = FriendsFingersCrowdsale.at(event.args.ffCrowdsale);
      this.token = FriendsFingersToken.at(await this.crowdsale.token());
    });

    describe('safe withdraw', function () {
      it('builder owner should fail to safe withdraw before a year after the end time', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });

        await increaseTimeTo(this.endTime + duration.years(1) - duration.days(1));
        await this.builder.safeWithdrawalFromCrowdsale(this.crowdsale.address, { from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('enabled address should fail to safe withdraw before a year after the end time', async function () {
        await this.builder.changeEnabledAddressStatus(auxWallet, true, { from: owner });

        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });

        await increaseTimeTo(this.endTime + duration.years(1) - duration.days(1));
        await this.builder.safeWithdrawalFromCrowdsale(this.crowdsale.address, { from: auxWallet }).should.be.rejectedWith(EVMRevert);
      });

      it('builder owner should safe withdraw after a year', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });

        await increaseTimeTo(this.endTime + duration.years(1));

        const contractPre = web3.eth.getBalance(this.crowdsale.address);
        const ffPre = web3.eth.getBalance(friendsFingersWallet);

        await this.builder.safeWithdrawalFromCrowdsale(this.crowdsale.address, { from: owner });

        const ffPost = web3.eth.getBalance(friendsFingersWallet);
        const contractPost = web3.eth.getBalance(this.crowdsale.address);

        contractPost.should.be.bignumber.equal(0);
        ffPost.minus(ffPre).should.be.bignumber.equal(contractPre);
      });

      it('enabled address should safe withdraw after a year', async function () {
        await this.builder.changeEnabledAddressStatus(auxWallet, true, { from: owner });

        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });

        await increaseTimeTo(this.endTime + duration.years(1));

        const contractPre = web3.eth.getBalance(this.crowdsale.address);
        const ffPre = web3.eth.getBalance(friendsFingersWallet);

        await this.builder.safeWithdrawalFromCrowdsale(this.crowdsale.address, { from: auxWallet });

        const ffPost = web3.eth.getBalance(friendsFingersWallet);
        const contractPost = web3.eth.getBalance(this.crowdsale.address);

        contractPost.should.be.bignumber.equal(0);
        ffPost.minus(ffPre).should.be.bignumber.equal(contractPre);
      });

      it('other users shouldn\'t safe withdraw after a year', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });

        await increaseTimeTo(this.endTime + duration.years(1));

        await this.builder.safeWithdrawalFromCrowdsale(this.crowdsale.address, { from: creator }).should.be.rejectedWith(EVMRevert);
        await this.builder.safeWithdrawalFromCrowdsale(this.crowdsale.address, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('set expired', function () {
      it('builder owner should fail to set expired and withdraw after a year if not refunding', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });
        await increaseTimeTo(this.afterEndTime);

        await this.builder.closeCrowdsale(this.crowdsale.address, { from: creator });

        await increaseTimeTo(this.endTime + duration.years(1));
        await this.builder.setExpiredAndWithdraw(this.crowdsale.address, { from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('enabled address should fail to set expired and withdraw after a year if not refunding', async function () {
        await this.builder.changeEnabledAddressStatus(auxWallet, true, { from: owner });

        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });
        await increaseTimeTo(this.afterEndTime);

        await this.builder.closeCrowdsale(this.crowdsale.address, { from: creator });

        await increaseTimeTo(this.endTime + duration.years(1));
        await this.builder.setExpiredAndWithdraw(this.crowdsale.address, { from: auxWallet }).should.be.rejectedWith(EVMRevert);
      });

      it('builder owner should fail to set expired and withdraw before a year after the end time', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });
        await increaseTimeTo(this.afterEndTime);

        await this.builder.closeCrowdsale(this.crowdsale.address, { from: creator });

        await increaseTimeTo(this.endTime + duration.years(1) - 1);
        await this.builder.setExpiredAndWithdraw(this.crowdsale.address, { from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('enabled address should fail to set expired and withdraw before a year after the end time', async function () {
        await this.builder.changeEnabledAddressStatus(auxWallet, true, { from: owner });

        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });
        await increaseTimeTo(this.afterEndTime);

        await this.builder.closeCrowdsale(this.crowdsale.address, { from: creator });

        await increaseTimeTo(this.endTime + duration.years(1) - 1);
        await this.builder.setExpiredAndWithdraw(this.crowdsale.address, { from: auxWallet }).should.be.rejectedWith(EVMRevert);
      });

      it('builder owner should set expired and withdraw after a year if people have not claimed', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.lessThanGoal, from: investor });
        await increaseTimeTo(this.afterEndTime);

        await this.builder.closeCrowdsale(this.crowdsale.address, { from: creator });

        const contractPre = web3.eth.getBalance(this.crowdsale.address);
        const ffPre = web3.eth.getBalance(friendsFingersWallet);

        contractPre.should.be.bignumber.equal(this.lessThanGoal);

        await increaseTimeTo(this.endTime + duration.years(1));
        await this.builder.setExpiredAndWithdraw(this.crowdsale.address, { from: owner });

        const postState = await this.crowdsale.state();
        postState.should.be.bignumber.equal(4); //Expired

        const ffPost = web3.eth.getBalance(friendsFingersWallet);
        const contractPost = web3.eth.getBalance(this.crowdsale.address);

        contractPost.should.be.bignumber.equal(0);
        ffPost.minus(ffPre).should.be.bignumber.equal(contractPre);
      });

      it('enabled address should set expired and withdraw after a year if people have not claimed', async function () {
        await this.builder.changeEnabledAddressStatus(auxWallet, true, { from: owner });

        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.lessThanGoal, from: investor });
        await increaseTimeTo(this.afterEndTime);

        await this.builder.closeCrowdsale(this.crowdsale.address, { from: creator });

        const contractPre = web3.eth.getBalance(this.crowdsale.address);
        const ffPre = web3.eth.getBalance(friendsFingersWallet);

        contractPre.should.be.bignumber.equal(this.lessThanGoal);

        await increaseTimeTo(this.endTime + duration.years(1));
        await this.builder.setExpiredAndWithdraw(this.crowdsale.address, { from: auxWallet });

        const postState = await this.crowdsale.state();
        postState.should.be.bignumber.equal(4); //Expired

        const ffPost = web3.eth.getBalance(friendsFingersWallet);
        const contractPost = web3.eth.getBalance(this.crowdsale.address);

        contractPost.should.be.bignumber.equal(0);
        ffPost.minus(ffPre).should.be.bignumber.equal(contractPre);
      });

      it('other users should\'t set expired and withdraw after a year if people have not claimed', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.lessThanGoal, from: investor });
        await increaseTimeTo(this.afterEndTime);

        await this.builder.closeCrowdsale(this.crowdsale.address, { from: creator });

        const contractPre = web3.eth.getBalance(this.crowdsale.address);
        contractPre.should.be.bignumber.equal(this.lessThanGoal);

        await increaseTimeTo(this.endTime + duration.years(1));
        await this.builder.setExpiredAndWithdraw(this.crowdsale.address, { from: creator }).should.be.rejectedWith(EVMRevert);
        await this.builder.setExpiredAndWithdraw(this.crowdsale.address, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('block campaign', function () {
      it('builder owner should block an active campaign', async function () {
        const preState = await this.crowdsale.state();
        preState.should.be.bignumber.equal(0); //Active
        await this.builder.blockCrowdsale(this.crowdsale.address, { from: owner });
        const postState = await this.crowdsale.state();
        postState.should.be.bignumber.equal(3); //Blocked
      });

      it('enabled address should block an active campaign', async function () {
        await this.builder.changeEnabledAddressStatus(auxWallet, true, { from: owner });
        const preState = await this.crowdsale.state();
        preState.should.be.bignumber.equal(0); //Active
        await this.builder.blockCrowdsale(this.crowdsale.address, { from: auxWallet });
        const postState = await this.crowdsale.state();
        postState.should.be.bignumber.equal(3); //Blocked
      });

      it('other users shouldn\'t block an active campaign', async function () {
        const preState = await this.crowdsale.state();
        preState.should.be.bignumber.equal(0); //Active
        await this.builder.blockCrowdsale(this.crowdsale.address, { from: creator }).should.be.rejectedWith(EVMRevert);
        await this.builder.blockCrowdsale(this.crowdsale.address, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('change FriendsFingers wallet', function () {
      it('builder owner should fail to change FriendsFingers wallet if 0x0', async function () {
        await this.builder.setFriendsFingersWalletForCrowdsale(this.crowdsale.address, 0x0, { from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('builder owner should change FriendsFingers wallet if valid address', async function () {
        const preWalletAddress = await this.crowdsale.friendsFingersWallet();
        preWalletAddress.should.be.equal(friendsFingersWallet);
        await this.builder.setFriendsFingersWalletForCrowdsale(this.crowdsale.address, auxWallet, { from: owner }).should.be.fulfilled;
        const postWalletAddress = await this.crowdsale.friendsFingersWallet();
        postWalletAddress.should.be.equal(auxWallet);
      });

      it('other users should\'t change FriendsFingers wallet if valid address', async function () {
        await this.builder.setFriendsFingersWalletForCrowdsale(this.crowdsale.address, auxWallet, { from: creator }).should.be.rejectedWith(EVMRevert);
        await this.builder.setFriendsFingersWalletForCrowdsale(this.crowdsale.address, auxWallet, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('change FriendsFingers fee', function () {
      it('builder owner should fail to change FriendsFingers fee if greater than previous', async function () {
        let friendsFingersRatePerMille = await this.crowdsale.friendsFingersRatePerMille();
        friendsFingersRatePerMille++;
        await this.builder.setFriendsFingersRateForCrowdsale(this.crowdsale.address, friendsFingersRatePerMille, { from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('builder owner should change FriendsFingers fee if less than previous', async function () {
        let friendsFingersRatePerMille = await this.crowdsale.friendsFingersRatePerMille();
        friendsFingersRatePerMille--;
        await this.builder.setFriendsFingersRateForCrowdsale(this.crowdsale.address, friendsFingersRatePerMille, { from: owner }).should.be.fulfilled;
        let newFriendsFingersRatePerMille = await this.crowdsale.friendsFingersRatePerMille();
        newFriendsFingersRatePerMille.should.be.bignumber.equal(friendsFingersRatePerMille);
      });

      it('other users should\'t change FriendsFingers fee if less than previous', async function () {
        let friendsFingersRatePerMille = await this.crowdsale.friendsFingersRatePerMille();
        friendsFingersRatePerMille--;
        await this.builder.setFriendsFingersRateForCrowdsale(this.crowdsale.address, friendsFingersRatePerMille, { from: creator }).should.be.rejectedWith(EVMRevert);
        await this.builder.setFriendsFingersRateForCrowdsale(this.crowdsale.address, friendsFingersRatePerMille, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('update crowdsale info', function () {
      it('builder owner or crowdsale creator should fail to update crowdsale info if ended', async function () {
        await increaseTimeTo(this.afterEndTime);

        let crowdsaleInfo = {
          title: "Test Crowdsale 2",
          description: "Lorem ipsum 2", //description
          url: "http://xxx2", //official url
          logo: "http://yyy2" //official logo
        };

        let jsonCrowdsaleInfo = JSON.stringify(crowdsaleInfo);

        await this.builder.updateCrowdsaleInfo(this.crowdsale.address, jsonCrowdsaleInfo, { from: creator }).should.be.rejectedWith(EVMRevert);
      });

      it('builder owner or crowdsale creator should update crowdsale info if not ended', async function () {
        let crowdsaleInfo = {
          title: "Test Crowdsale 2",
          description: "Lorem ipsum 2", //description
          url: "http://xxx2", //official url
          logo: "http://yyy2" //official logo
        };

        let jsonCrowdsaleInfo = JSON.stringify(crowdsaleInfo);

        await this.builder.updateCrowdsaleInfo(this.crowdsale.address, jsonCrowdsaleInfo, { from: owner });
        let newCrowdsaleInfo = await this.crowdsale.crowdsaleInfo();
        newCrowdsaleInfo.should.be.equal(jsonCrowdsaleInfo);

        await this.builder.updateCrowdsaleInfo(this.crowdsale.address, jsonCrowdsaleInfo, { from: creator });
        newCrowdsaleInfo = await this.crowdsale.crowdsaleInfo();
        newCrowdsaleInfo.should.be.equal(jsonCrowdsaleInfo);
      });

      it('other users should\'t update crowdsale info if not ended', async function () {
        let crowdsaleInfo = {
          title: "Test Crowdsale 2",
          description: "Lorem ipsum 2", //description
          url: "http://xxx2", //official url
          logo: "http://yyy2" //official logo
        };

        let jsonCrowdsaleInfo = JSON.stringify(crowdsaleInfo);

        await this.builder.updateCrowdsaleInfo(this.crowdsale.address, jsonCrowdsaleInfo, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('pause', function () {
      it('builder owner can pause a crowdsale', async function () {
        let paused = await this.crowdsale.paused();
        assert.equal(paused, false);
        await this.builder.pauseCrowdsale(this.crowdsale.address, { from: owner });
        paused = await this.crowdsale.paused();
        assert.equal(paused, true);
      });

      it('enabled address can pause a crowdsale', async function () {
        await this.builder.changeEnabledAddressStatus(auxWallet, true, { from: owner });
        let paused = await this.crowdsale.paused();
        assert.equal(paused, false);
        await this.builder.pauseCrowdsale(this.crowdsale.address, { from: auxWallet });
        paused = await this.crowdsale.paused();
        assert.equal(paused, true);
      });

      it('other users creator can\'t pause a crowdsale', async function () {
        let paused = await this.crowdsale.paused();
        assert.equal(paused, false);
        await this.builder.pauseCrowdsale(this.crowdsale.address, { from: creator }).should.be.rejectedWith(EVMRevert);
        await this.builder.pauseCrowdsale(this.crowdsale.address, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
        paused = await this.crowdsale.paused();
        assert.equal(paused, false);
      });
    });

    describe('unpause', function () {
      it('builder owner can unpause a crowdsale', async function () {
        let paused = await this.crowdsale.paused();
        assert.equal(paused, false);
        await this.builder.pauseCrowdsale(this.crowdsale.address, { from: owner });
        paused = await this.crowdsale.paused();
        assert.equal(paused, true);
        await this.builder.unpauseCrowdsale(this.crowdsale.address, { from: owner });
        paused = await this.crowdsale.paused();
        assert.equal(paused, false);
      });

      it('enabled address can unpause a crowdsale', async function () {
        await this.builder.changeEnabledAddressStatus(auxWallet, true, { from: owner });
        let paused = await this.crowdsale.paused();
        assert.equal(paused, false);
        await this.builder.pauseCrowdsale(this.crowdsale.address, { from: auxWallet });
        paused = await this.crowdsale.paused();
        assert.equal(paused, true);
        await this.builder.unpauseCrowdsale(this.crowdsale.address, { from: auxWallet });
        paused = await this.crowdsale.paused();
        assert.equal(paused, false);
      });

      it('other users can\'t unpause a crowdsale', async function () {
        let paused = await this.crowdsale.paused();
        assert.equal(paused, false);
        await this.builder.pauseCrowdsale(this.crowdsale.address, { from: owner });
        paused = await this.crowdsale.paused();
        assert.equal(paused, true);
        await this.builder.unpauseCrowdsale(this.crowdsale.address, { from: creator }).should.be.rejectedWith(EVMRevert);
        await this.builder.unpauseCrowdsale(this.crowdsale.address, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
        paused = await this.crowdsale.paused();
        assert.equal(paused, true);
      });
    });
  });

  describe('utilities for builder', function () {
    describe('set enabled address', function () {
      it('builder owner should success to change enabled address status', async function () {
        let addressStatus = await this.builder.enabledAddresses(auxWallet);
        assert.equal(addressStatus, false);

        await this.builder.changeEnabledAddressStatus(auxWallet, true, { from: owner });
        addressStatus = await this.builder.enabledAddresses(auxWallet);
        assert.equal(addressStatus, true);

        await this.builder.changeEnabledAddressStatus(auxWallet, false, { from: owner });
        addressStatus = await this.builder.enabledAddresses(auxWallet);
        assert.equal(addressStatus, false);
      });

      it('enabled address should fail to change his status', async function () {
        let addressStatus = await this.builder.enabledAddresses(auxWallet);
        assert.equal(addressStatus, false);

        await this.builder.changeEnabledAddressStatus(auxWallet, true, { from: owner });
        addressStatus = await this.builder.enabledAddresses(auxWallet);
        assert.equal(addressStatus, true);

        await this.builder.changeEnabledAddressStatus(auxWallet, false, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
        addressStatus = await this.builder.enabledAddresses(auxWallet);
        assert.equal(addressStatus, true);
      });

      it('other users should fail to change enabled address status', async function () {
        let addressStatus = await this.builder.enabledAddresses(auxWallet);
        assert.equal(addressStatus, false);

        await this.builder.changeEnabledAddressStatus(auxWallet, true, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
        addressStatus = await this.builder.enabledAddresses(auxWallet);
        assert.equal(addressStatus, false);
      });
    });

    describe('set default FriendsFingers rate', function () {
      it('builder owner should fail to change FriendsFingers fee if greater than previous', async function () {
        let friendsFingersRatePerMille = await this.builder.friendsFingersRatePerMille();
        friendsFingersRatePerMille++;
        await this.builder.setDefaultFriendsFingersRate(friendsFingersRatePerMille, { from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('builder owner should change FriendsFingers fee if less than previous', async function () {
        let friendsFingersRatePerMille = await this.builder.friendsFingersRatePerMille();
        friendsFingersRatePerMille--;
        await this.builder.setDefaultFriendsFingersRate(friendsFingersRatePerMille, { from: owner }).should.be.fulfilled;
        let newFriendsFingersRatePerMille = await this.builder.friendsFingersRatePerMille();
        newFriendsFingersRatePerMille.should.be.bignumber.equal(friendsFingersRatePerMille);
      });

      it('other users should\'t change FriendsFingers fee if less than previous', async function () {
        let friendsFingersRatePerMille = await this.builder.friendsFingersRatePerMille();
        friendsFingersRatePerMille--;
        await this.builder.setDefaultFriendsFingersRate(friendsFingersRatePerMille, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('change FriendsFingers main wallet', function () {
      it('builder owner should fail to change FriendsFingers wallet if 0x0', async function () {
        await this.builder.setMainWallet(0x0, { from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('builder owner should change FriendsFingers wallet if valid address', async function () {
        const preWalletAddress = await this.builder.friendsFingersWallet();
        preWalletAddress.should.be.equal(friendsFingersWallet);
        await this.builder.setMainWallet(auxWallet, { from: owner }).should.be.fulfilled;
        const postWalletAddress = await this.builder.friendsFingersWallet();
        postWalletAddress.should.be.equal(auxWallet);
      });

      it('other users should\'t change FriendsFingers wallet if valid address', async function () {
        await this.builder.setMainWallet(auxWallet, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });
  });

  describe('direct donation', function () {
    it('should forward funds to builder wallet if direct donation', async function () {
      const pre = web3.eth.getBalance(friendsFingersWallet);
      await this.builder.sendTransaction({ value: value, from: investor });
      const post = web3.eth.getBalance(friendsFingersWallet);
      post.minus(pre).should.be.bignumber.equal(value);
    });
  });

  describe('recover ERC20 tokens', function () {
    it('should safe transfer tokens to beneficiary if sent into the contract', async function () {
      const token1 = await FriendsFingersToken.new(this.name, this.symbol, this.decimals);

      await token1.mint(this.builder.address, 200);
      await token1.finishMinting();

      let balanceContract = await token1.balanceOf(this.builder.address);
      assert.equal(balanceContract, 200);
      let balanceBeneficiary = await token1.balanceOf(thirdparty);
      assert.equal(balanceBeneficiary, 0);

      await this.builder.transferAnyERC20Token(token1.address, 30, thirdparty, { from: owner });

      balanceContract = await token1.balanceOf(this.builder.address);
      assert.equal(balanceContract, 170);
      balanceBeneficiary = await token1.balanceOf(thirdparty);
      assert.equal(balanceBeneficiary, 30);
    });

    it('owner or enabled address should safe transfer tokens from a crowdsale to builder wallet if sent into the contract', async function () {
      this.startTime = latestTime() + duration.weeks(1);
      this.endTime = this.startTime + duration.weeks(1);
      this.afterStartTime = this.startTime + duration.seconds(1);
      this.afterEndTime = this.endTime + duration.seconds(1);

      const { logs } = await this.builder.startCrowdsale(
        this.name,
        this.symbol,
        this.decimals,
        this.cap,
        this.goal,
        this.creatorSupply,
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        this.crowdsaleInfo,
        { from: creator }
      );

      const event = logs.find(e => e.event === 'CrowdsaleStarted');

      this.crowdsale = FriendsFingersCrowdsale.at(event.args.ffCrowdsale);

      const token1 = await FriendsFingersToken.new(this.name, this.symbol, this.decimals);

      await token1.mint(this.crowdsale.address, 200);
      await token1.finishMinting();

      let balanceContract1 = await token1.balanceOf(this.crowdsale.address);
      assert.equal(balanceContract1, 200);
      let balanceBeneficiary1 = await token1.balanceOf(friendsFingersWallet);
      assert.equal(balanceBeneficiary1, 0);

      await this.builder.safeTokenWithdrawalFromCrowdsale(this.crowdsale.address, token1.address, 30, { from: owner });

      balanceContract1 = await token1.balanceOf(this.crowdsale.address);
      assert.equal(balanceContract1, 170);
      balanceBeneficiary1 = await token1.balanceOf(friendsFingersWallet);
      assert.equal(balanceBeneficiary1, 30);

      await this.builder.changeEnabledAddressStatus(auxWallet, true, { from: owner });

      const token2 = await FriendsFingersToken.new(this.name, this.symbol, this.decimals);

      await token2.mint(this.crowdsale.address, 200);
      await token2.finishMinting();

      let balanceContract2 = await token2.balanceOf(this.crowdsale.address);
      assert.equal(balanceContract2, 200);
      let balanceBeneficiary2 = await token2.balanceOf(friendsFingersWallet);
      assert.equal(balanceBeneficiary2, 0);

      await this.builder.safeTokenWithdrawalFromCrowdsale(this.crowdsale.address, token2.address, 30, { from: auxWallet });

      balanceContract2 = await token2.balanceOf(this.crowdsale.address);
      assert.equal(balanceContract2, 170);
      balanceBeneficiary2 = await token2.balanceOf(friendsFingersWallet);
      assert.equal(balanceBeneficiary2, 30);
    });
  });
});