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

const FriendsFingersCrowdsale = artifacts.require('FriendsFingersCrowdsale');
const FriendsFingersToken = artifacts.require('FriendsFingersToken');

contract('FriendsFingersCrowdsale', function ([_, owner, investor, wallet, purchaser, friendsFingersWallet, thirdparty, auxWallet]) {

  const value = ether(1);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function () {
    this.name = "Shaka";
    this.symbol = "HAK";
    this.decimals = 18;

    this.id = 10;
    this.round = 1;
    this.previousRound = 0;
    this.friendsFingersRatePerMille = 50;

    this.startTime = latestTime() + duration.weeks(1);
    this.endTime = this.startTime + duration.weeks(1);
    this.afterEndTime = this.endTime + duration.seconds(1);

    this.cap = ether(3);
    this.lessThanCap = ether(2);

    this.goal = ether(2);
    this.lessThanGoal = ether(1);

    this.rate = new BigNumber(1000);
    this.expectedTokenAmount = this.rate.mul(value);

    this.crowdsaleInfo = JSON.stringify({
      title: "Test Crowdsale",
      description: "Lorem ipsum", //description
      url: "http://xxx", //official url
      logo: "http://yyy" //official logo
    });

    this.token = await FriendsFingersToken.new(this.name, this.symbol, this.decimals);

    this.crowdsale = await FriendsFingersCrowdsale.new(
      this.id,
      this.cap,
      this.goal,
      this.startTime,
      this.endTime,
      this.rate,
      wallet,
      this.token.address,
      this.crowdsaleInfo,
      this.round,
      this.previousRound,
      this.friendsFingersRatePerMille,
      friendsFingersWallet,
      { from: owner }
    );

    await this.token.transferOwnership(this.crowdsale.address);
  });

  describe('creating a valid crowdsale', function () {
    it('should be token owner', async function () {
      const owner = await this.token.owner();
      owner.should.equal(this.crowdsale.address);
    });

    it('should fail with start time in the past', async function () {
      await FriendsFingersCrowdsale.new(
        this.id,
        this.cap,
        this.goal,
        latestTime() - duration.seconds(1),
        this.endTime,
        this.rate,
        wallet,
        this.token.address,
        this.crowdsaleInfo,
        this.round,
        this.previousRound,
        this.friendsFingersRatePerMille,
        friendsFingersWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('should fail with end time before start time', async function () {
      await FriendsFingersCrowdsale.new(
        this.id,
        this.cap,
        this.goal,
        this.startTime,
        this.startTime - duration.seconds(1),
        this.rate,
        wallet,
        this.token.address,
        this.crowdsaleInfo,
        this.round,
        this.previousRound,
        this.friendsFingersRatePerMille,
        friendsFingersWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('should fail with end time more than 30 days after start time', async function () {
      await FriendsFingersCrowdsale.new(
        this.id,
        this.cap,
        this.goal,
        this.startTime,
        this.startTime + duration.days(30) + 1,
        this.rate,
        wallet,
        this.token.address,
        this.crowdsaleInfo,
        this.round,
        this.previousRound,
        this.friendsFingersRatePerMille,
        friendsFingersWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('should fail with zero rate', async function () {
      await FriendsFingersCrowdsale.new(
        this.id,
        this.cap,
        this.goal,
        this.startTime,
        this.endTime,
        0,
        wallet,
        this.token.address,
        this.crowdsaleInfo,
        this.round,
        this.previousRound,
        this.friendsFingersRatePerMille,
        friendsFingersWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('should fail with 0x0 wallet', async function () {
      await FriendsFingersCrowdsale.new(
        this.id,
        this.cap,
        this.goal,
        this.startTime,
        this.endTime,
        this.rate,
        0x0,
        this.token.address,
        this.crowdsaleInfo,
        this.round,
        this.previousRound,
        this.friendsFingersRatePerMille,
        friendsFingersWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('should fail with zero cap', async function () {
      await FriendsFingersCrowdsale.new(
        this.id,
        0,
        this.goal,
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        this.token.address,
        this.crowdsaleInfo,
        this.round,
        this.previousRound,
        this.friendsFingersRatePerMille,
        friendsFingersWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('should fail with zero goal', async function () {
      await FriendsFingersCrowdsale.new(
        this.id,
        this.cap,
        0,
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        this.token.address,
        this.crowdsaleInfo,
        this.round,
        this.previousRound,
        this.friendsFingersRatePerMille,
        friendsFingersWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('should fail with cap under goal', async function () {
      await FriendsFingersCrowdsale.new(
        this.id,
        ether(2),
        ether(3),
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        this.token.address,
        this.crowdsaleInfo,
        this.round,
        this.previousRound,
        this.friendsFingersRatePerMille,
        friendsFingersWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('should success with zero goal if it is the first crowdsale started', async function () {
      await FriendsFingersCrowdsale.new(
        1,
        this.cap,
        0,
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        this.token.address,
        this.crowdsaleInfo,
        this.round,
        this.previousRound,
        this.friendsFingersRatePerMille,
        friendsFingersWallet
      ).should.be.fulfilled;
    });

    it('should fail with 0x0 token address', async function () {
      await FriendsFingersCrowdsale.new(
        this.id,
        this.cap,
        this.goal,
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        0x0,
        this.crowdsaleInfo,
        this.round,
        this.previousRound,
        this.friendsFingersRatePerMille,
        friendsFingersWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('should fail with round greater than 5', async function () {
      await FriendsFingersCrowdsale.new(
        this.id,
        this.cap,
        this.goal,
        this.startTime,
        this.endTime,
        this.rate,
        wallet,
        this.token.address,
        this.crowdsaleInfo,
        6,
        this.previousRound,
        this.friendsFingersRatePerMille,
        friendsFingersWallet
      ).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('accepting payments', function () {
    it('should reject payments before start', async function () {
      await this.crowdsale.send(value).should.be.rejectedWith(EVMRevert);
      await this.crowdsale.buyTokens(investor, { from: purchaser, value: value }).should.be.rejectedWith(EVMRevert);
    });

    it('should accept payments after start', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.send(value).should.be.fulfilled;
      await this.crowdsale.buyTokens(investor, { value: value, from: purchaser }).should.be.fulfilled;
    });

    it('should reject payments after end', async function () {
      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.send(value).should.be.rejectedWith(EVMRevert);
      await this.crowdsale.buyTokens(investor, { value: value, from: purchaser }).should.be.rejectedWith(EVMRevert);
    });

    it('should accept payments within cap', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.send(this.cap.minus(this.lessThanCap)).should.be.fulfilled;
      await this.crowdsale.send(this.lessThanCap).should.be.fulfilled;
    });

    it('should reject payments outside cap', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.send(this.cap);
      await this.crowdsale.send(1).should.be.rejectedWith(EVMRevert);
    });

    it('should reject payments that exceed cap', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.send(this.cap.plus(1)).should.be.rejectedWith(EVMRevert);
    });

    it('should reject payments if campaign is blocked', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.blockCrowdsale({ from: owner });
      await this.crowdsale.send(value).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('high-level purchase', function () {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('should log purchase', async function () {
      const { logs } = await this.crowdsale.sendTransaction({ value: value, from: investor });

      const event = logs.find(e => e.event === 'TokenPurchase');

      should.exist(event);
      event.args.purchaser.should.equal(investor);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(value);
      event.args.amount.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should increase totalSupply', async function () {
      await this.crowdsale.send(value);
      const totalSupply = await this.token.totalSupply();
      totalSupply.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should assign tokens to sender', async function () {
      await this.crowdsale.sendTransaction({ value: value, from: investor });
      let balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should keep funds into contract', async function () {
      const pre = web3.eth.getBalance(this.crowdsale.address);
      await this.crowdsale.sendTransaction({ value, from: investor });
      const post = web3.eth.getBalance(this.crowdsale.address);
      post.minus(pre).should.be.bignumber.equal(value);
    });
  });

  describe('low-level purchase', function () {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('should log purchase', async function () {
      const { logs } = await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });

      const event = logs.find(e => e.event === 'TokenPurchase');

      should.exist(event);
      event.args.purchaser.should.equal(purchaser);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(value);
      event.args.amount.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should increase totalSupply', async function () {
      await this.crowdsale.buyTokens(investor, { value, from: purchaser });
      const totalSupply = await this.token.totalSupply();
      totalSupply.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should assign tokens to beneficiary', async function () {
      await this.crowdsale.buyTokens(investor, { value, from: purchaser });
      const balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should keep funds into contract', async function () {
      const pre = web3.eth.getBalance(this.crowdsale.address);
      await this.crowdsale.buyTokens(investor, { value, from: purchaser });
      const post = web3.eth.getBalance(this.crowdsale.address);
      post.minus(pre).should.be.bignumber.equal(value);
    });
  });

  describe('ending', function () {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('should not be ended if under cap', async function () {
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
      await this.crowdsale.send(this.lessThanCap);
      hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
    });

    it('should not be ended if just under cap', async function () {
      await this.crowdsale.send(this.cap.minus(1));
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
    });

    it('should be ended if cap reached', async function () {
      await this.crowdsale.send(this.cap);
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(true);
    });

    it('should not be ended before end', async function () {
      let ended = await this.crowdsale.hasEnded();
      ended.should.equal(false);
    });

    it('should be ended after end', async function () {
      let ended = await this.crowdsale.hasEnded();
      ended.should.equal(false);
      await increaseTimeTo(this.afterEndTime);
      ended = await this.crowdsale.hasEnded();
      ended.should.equal(true);
    });
  });

  describe('finalizing', function () {
    it('cannot be finalized before ending', async function () {
      await this.crowdsale.finalize({ from: owner }).should.be.rejectedWith(EVMRevert);
    });

    it('cannot be finalized by third party after ending', async function () {
      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.finalize({ from: thirdparty }).should.be.rejectedWith(EVMRevert);
    });

    it('can be finalized by owner after ending', async function () {
      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.finalize({ from: owner }).should.be.fulfilled;
    });

    it('cannot be finalized twice', async function () {
      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.finalize({ from: owner });
      await this.crowdsale.finalize({ from: owner }).should.be.rejectedWith(EVMRevert);
    });

    it('logs finalized', async function () {
      await increaseTimeTo(this.afterEndTime);
      const { logs } = await this.crowdsale.finalize({ from: owner });
      const event = logs.find(e => e.event === 'Finalized');
      should.exist(event);
    });
  });

  describe('refunding', function () {
    it('should deny refunds before end', async function () {
      await this.crowdsale.claimRefund({ from: investor }).should.be.rejectedWith(EVMRevert);
      await increaseTimeTo(this.startTime);
      await this.crowdsale.claimRefund({ from: investor }).should.be.rejectedWith(EVMRevert);
    });

    it('should deny refunds after end if goal was reached', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.sendTransaction({ value: this.goal, from: investor });
      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.claimRefund({ from: investor }).should.be.rejectedWith(EVMRevert);
    });

    it('should allow refunds after end if goal was not reached', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.sendTransaction({ value: this.lessThanGoal, from: investor });
      await increaseTimeTo(this.afterEndTime);

      await this.crowdsale.finalize({ from: owner });

      const pre = web3.eth.getBalance(investor);
      await this.crowdsale.claimRefund({ from: investor, gasPrice: 0 }).should.be.fulfilled;
      const post = web3.eth.getBalance(investor);

      post.minus(pre).should.be.bignumber.equal(this.lessThanGoal);
    });
  });

  describe('ended', function () {
    it('should give tokens to crowdsale builder after end', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.sendTransaction({ value: this.goal, from: investor });
      await increaseTimeTo(this.afterEndTime);

      const crowdsaleBuilder = await this.crowdsale.owner();
      const ffPre = await this.token.balanceOf(crowdsaleBuilder);

      await this.crowdsale.finalize({ from: owner });

      const ffPost = await this.token.balanceOf(crowdsaleBuilder);

      ffPost.minus(ffPre).should.be.bignumber.equal(this.cap.mul(this.rate).mul(this.friendsFingersRatePerMille).div(1000));
    });

    it('should forward funds to wallet after end if goal was reached', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.sendTransaction({ value: this.goal, from: investor });
      await increaseTimeTo(this.afterEndTime);

      const contractPre = web3.eth.getBalance(this.crowdsale.address);
      contractPre.should.be.bignumber.equal(this.goal);

      const walletPre = web3.eth.getBalance(wallet);
      const ffPre = web3.eth.getBalance(friendsFingersWallet);

      await this.crowdsale.finalize({ from: owner });

      const contractPost = web3.eth.getBalance(this.crowdsale.address);
      contractPost.should.be.bignumber.equal(0);

      const walletPost = web3.eth.getBalance(wallet);
      const ffPost = web3.eth.getBalance(friendsFingersWallet);

      walletPost.minus(walletPre).should.be.bignumber.equal(this.goal.mul(1000 - this.friendsFingersRatePerMille).div(1000));
      ffPost.minus(ffPre).should.be.bignumber.equal(this.goal.mul(this.friendsFingersRatePerMille).div(1000));
    });
  });

  describe('paused', function () {
    describe('accepting payments', function () {
      beforeEach(async function () {
        await this.crowdsale.pause({ from: owner });
      });

      it('should reject payments after start', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.send(value).should.be.rejectedWith(EVMRevert);
        await this.crowdsale.buyTokens(investor, { value: value, from: purchaser }).should.be.rejectedWith(EVMRevert);
      });

      it('should reject payments within cap', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.send(this.lessThanCap).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('refunding', function () {
      it('should deny refunds after end also if goal was not reached', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.lessThanGoal, from: investor });
        await increaseTimeTo(this.afterEndTime);

        await this.crowdsale.finalize({ from: owner });

        await this.crowdsale.pause({ from: owner });

        await this.crowdsale.claimRefund({ from: investor, gasPrice: 0 }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('finalizing', function () {
      it('cannot be finalized', async function () {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.pause({ from: owner });
        await this.crowdsale.finalize({ from: owner }).should.be.rejectedWith(EVMRevert);
      });
    });
  });

  describe('utility and emergency tools', function () {
    describe('safe withdraw', function () {
      it('owner should fail to safe withdraw before a year after the end time', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });

        await increaseTimeTo(this.endTime + duration.years(1) - duration.days(1));
        await this.crowdsale.safeWithdrawal({ from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('owner should safe withdraw after a year', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });

        await increaseTimeTo(this.endTime + duration.years(1));

        const contractPre = web3.eth.getBalance(this.crowdsale.address);
        const ffPre = web3.eth.getBalance(friendsFingersWallet);

        await this.crowdsale.safeWithdrawal({ from: owner });

        const ffPost = web3.eth.getBalance(friendsFingersWallet);
        const contractPost = web3.eth.getBalance(this.crowdsale.address);

        contractPost.should.be.bignumber.equal(0);
        ffPost.minus(ffPre).should.be.bignumber.equal(contractPre);
      });

      it('third party shouldn\'t safe withdraw after a year', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });

        await increaseTimeTo(this.endTime + duration.years(1));
        await this.crowdsale.safeWithdrawal({ from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('set expired', function () {
      it('owner should fail to set expired and withdraw after a year if not refunding', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });
        await increaseTimeTo(this.afterEndTime);

        await this.crowdsale.finalize({ from: owner });

        await increaseTimeTo(this.endTime + duration.years(1));
        await this.crowdsale.setExpiredAndWithdraw({ from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('owner should fail to set expired and withdraw before a year after the end time', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });
        await increaseTimeTo(this.afterEndTime);

        await this.crowdsale.finalize({ from: owner });

        await increaseTimeTo(this.endTime + duration.years(1) - 1);
        await this.crowdsale.setExpiredAndWithdraw({ from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('owner should set expired and withdraw after a year if people have not claimed', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.lessThanGoal, from: investor });
        await increaseTimeTo(this.afterEndTime);

        await this.crowdsale.finalize({ from: owner });

        const contractPre = web3.eth.getBalance(this.crowdsale.address);
        const ffPre = web3.eth.getBalance(friendsFingersWallet);

        contractPre.should.be.bignumber.equal(this.lessThanGoal);

        await increaseTimeTo(this.endTime + duration.years(1));
        await this.crowdsale.setExpiredAndWithdraw({ from: owner });

        const postState = await this.crowdsale.state();
        postState.should.be.bignumber.equal(4); //Expired

        const ffPost = web3.eth.getBalance(friendsFingersWallet);
        const contractPost = web3.eth.getBalance(this.crowdsale.address);

        contractPost.should.be.bignumber.equal(0);
        ffPost.minus(ffPre).should.be.bignumber.equal(contractPre);
      });

      it('third party shouldn\'t set expired and withdraw after a year if people have not claimed', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.lessThanGoal, from: investor });
        await increaseTimeTo(this.afterEndTime);

        await this.crowdsale.finalize({ from: owner });

        const contractPre = web3.eth.getBalance(this.crowdsale.address);
        contractPre.should.be.bignumber.equal(this.lessThanGoal);

        await increaseTimeTo(this.endTime + duration.years(1));
        await this.crowdsale.setExpiredAndWithdraw({ from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('block campaign', function () {
      it('owner should fail to block a campaign if not active', async function () {
        await increaseTimeTo(this.startTime);
        await this.crowdsale.sendTransaction({ value: this.goal, from: investor });
        await increaseTimeTo(this.afterEndTime);

        await this.crowdsale.finalize({ from: owner });

        const preState = await this.crowdsale.state();
        preState.should.be.bignumber.equal(2); //Closed
        await this.crowdsale.blockCrowdsale({ from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('owner should block an active campaign', async function () {
        const preState = await this.crowdsale.state();
        preState.should.be.bignumber.equal(0); //Active
        await this.crowdsale.blockCrowdsale({ from: owner });
        const postState = await this.crowdsale.state();
        postState.should.be.bignumber.equal(3); //Blocked
      });

      it('third party shouldn\'t block an active campaign', async function () {
        const preState = await this.crowdsale.state();
        preState.should.be.bignumber.equal(0); //Active
        await this.crowdsale.blockCrowdsale({ from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('change FriendsFingers wallet', function () {
      it('owner should fail to change FriendsFingers wallet if 0x0', async function () {
        await this.crowdsale.setFriendsFingersWallet(0x0, { from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('owner should change FriendsFingers wallet if valid address', async function () {
        const preWalletAddress = await this.crowdsale.friendsFingersWallet();
        preWalletAddress.should.be.equal(friendsFingersWallet);
        await this.crowdsale.setFriendsFingersWallet(auxWallet, { from: owner }).should.be.fulfilled;
        const postWalletAddress = await this.crowdsale.friendsFingersWallet();
        postWalletAddress.should.be.equal(auxWallet);
      });

      it('third party shouldn\'t change FriendsFingers wallet if valid address', async function () {
        await this.crowdsale.setFriendsFingersWallet(auxWallet, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('change FriendsFingers fee', function () {
      it('owner should fail to change FriendsFingers fee if greater than previous', async function () {
        let friendsFingersRatePerMille = await this.crowdsale.friendsFingersRatePerMille();
        friendsFingersRatePerMille++;
        await this.crowdsale.setFriendsFingersRate(friendsFingersRatePerMille, { from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('owner should change FriendsFingers fee if less than previous', async function () {
        let friendsFingersRatePerMille = await this.crowdsale.friendsFingersRatePerMille();
        friendsFingersRatePerMille--;
        await this.crowdsale.setFriendsFingersRate(friendsFingersRatePerMille, { from: owner }).should.be.fulfilled;
        let newFriendsFingersRatePerMille = await this.crowdsale.friendsFingersRatePerMille();
        newFriendsFingersRatePerMille.should.be.bignumber.equal(friendsFingersRatePerMille);
      });

      it('third party shouldn\'t change FriendsFingers fee if less than previous', async function () {
        let friendsFingersRatePerMille = await this.crowdsale.friendsFingersRatePerMille();
        friendsFingersRatePerMille--;
        await this.crowdsale.setFriendsFingersRate(friendsFingersRatePerMille, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('update crowdsale info', function () {
      it('owner should fail to update crowdsale info if ended', async function () {
        await increaseTimeTo(this.afterEndTime);

        let jsonCrowdsaleInfo = JSON.stringify({
          title: "Test Crowdsale 2",
          description: "Lorem ipsum 2", //description
          url: "http://xxx2", //official url
          logo: "http://yyy2" //official logo
        });

        await this.crowdsale.updateCrowdsaleInfo(jsonCrowdsaleInfo, { from: owner }).should.be.rejectedWith(EVMRevert);
      });

      it('owner should update crowdsale info if not ended', async function () {
        let jsonCrowdsaleInfo = JSON.stringify({
          title: "Test Crowdsale 2",
          description: "Lorem ipsum 2", //description
          url: "http://xxx2", //official url
          logo: "http://yyy2" //official logo
        });

        await this.crowdsale.updateCrowdsaleInfo(jsonCrowdsaleInfo, { from: owner });

        let newCrowdsaleInfo = await this.crowdsale.crowdsaleInfo();

        newCrowdsaleInfo.should.be.equal(jsonCrowdsaleInfo);
      });

      it('third party shouldn\'t update crowdsale info if not ended', async function () {
        let jsonCrowdsaleInfo = JSON.stringify({
          title: "Test Crowdsale 2",
          description: "Lorem ipsum 2", //description
          url: "http://xxx2", //official url
          logo: "http://yyy2" //official logo
        });

        await this.crowdsale.updateCrowdsaleInfo(jsonCrowdsaleInfo, { from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });
    });
  });

  describe('recover ERC20 tokens', function () {
    it('should safe transfer tokens to beneficiary if sent into the contract', async function () {
      const token1 = await FriendsFingersToken.new(this.name, this.symbol, this.decimals);

      await token1.mint(this.crowdsale.address, 200);
      await token1.finishMinting();

      let balanceContract = await token1.balanceOf(this.crowdsale.address);
      assert.equal(balanceContract, 200);
      let balanceBeneficiary = await token1.balanceOf(thirdparty);
      assert.equal(balanceBeneficiary, 0);

      await this.crowdsale.transferAnyERC20Token(token1.address, 30, thirdparty, { from: owner });

      balanceContract = await token1.balanceOf(this.crowdsale.address);
      assert.equal(balanceContract, 170);
      balanceBeneficiary = await token1.balanceOf(thirdparty);
      assert.equal(balanceBeneficiary, 30);
    });
  });
});