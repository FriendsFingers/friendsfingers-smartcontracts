import expectThrow from './helpers/expectThrow';
import assertRevert from './helpers/assertRevert';

const EVMRevert = require('./helpers/EVMRevert.js');
const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const expect = require('chai').expect;

const FriendsFingersToken = artifacts.require('FriendsFingersToken');
const ContractReceiverImpl = artifacts.require('ContractReceiverImpl');

contract('FriendsFingersToken', function (accounts) {

    let obj = {
        name: "Shaka",
        symbol: "HAK",
        decimals: 18
    };

    describe('should have correct values and properties after construction', function () {
        let token = null;

        beforeEach(async function () {
            token = await FriendsFingersToken.new(obj.name, obj.symbol, obj.decimals);
        });

        it('has a name', async function () {
            const name = await token.name();
            name.should.be.equal(obj.name);
        });

        it('has a symbol', async function () {
            const symbol = await token.symbol();
            symbol.should.be.equal(obj.symbol);
        });

        it('has an amount of decimals', async function () {
            const decimals = await token.decimals();
            decimals.should.be.bignumber.equal(obj.decimals);
        });

        it('should start with a totalSupply of 0', async function () {
            let totalSupply = await token.totalSupply();
            assert.equal(totalSupply, 0);
        });

        it('should return mintingFinished false after construction', async function () {
            let mintingFinished = await token.mintingFinished();
            assert.equal(mintingFinished, false);
        });
    });

    describe('should work as a mintable token', function () {
        let token;

        beforeEach(async function () {
            token = await FriendsFingersToken.new(obj.name, obj.symbol, obj.decimals);
        });

        it('should mint a given amount of tokens to a given address', async function () {
            const result = await token.mint(accounts[0], 100);
            assert.equal(result.logs[0].event, 'Mint');
            assert.equal(result.logs[0].args.to.valueOf(), accounts[0]);
            assert.equal(result.logs[0].args.amount.valueOf(), 100);
            assert.equal(result.logs[1].event, 'Transfer');
            assert.equal(result.logs[1].args.from.valueOf(), 0x0);

            let balance0 = await token.balanceOf(accounts[0]);
            assert(balance0, 100);

            let totalSupply = await token.totalSupply();
            assert(totalSupply, 100);
        });

        it('should fail to mint after call to finishMinting', async function () {
            await token.finishMinting();
            assert.equal(await token.mintingFinished(), true);
            await expectThrow(token.mint(accounts[0], 100));
        });
    });

    describe('should work as a burnable token', function () {
        let token;
        let expectedTokenSupply = new BigNumber(999);

        beforeEach(async function () {
            token = await FriendsFingersToken.new(obj.name, obj.symbol, obj.decimals);
            await token.mint(accounts[0], 1000);
            await token.finishMinting();
        });

        it('owner should be able to burn tokens', async function () {
            const { logs } = await token.burn(1, { from: accounts[0] });

            const balance = await token.balanceOf(accounts[0]);
            balance.should.be.bignumber.equal(expectedTokenSupply);

            const totalSupply = await token.totalSupply();
            totalSupply.should.be.bignumber.equal(expectedTokenSupply);

            const event = logs.find(e => e.event === 'Burn');
            expect(event).to.exist;
        });

        it('cannot burn more tokens than your balance', async function () {
            await token.burn(2000, { from: accounts[0] }).should.be.rejectedWith(EVMRevert);
        });
    });

    describe('should work as a standard ERC20 token with a can transfer restriction', function () {
        let token;

        beforeEach(async function () {
            token = await FriendsFingersToken.new(obj.name, obj.symbol, obj.decimals);
            await token.mint(accounts[0], 100);
        });

        describe('during minting', function () {
            it('should fail to transfer a given amount of tokens to a given address', async function () {
                assert.equal(await token.mintingFinished(), false);
                await assertRevert(token.transfer(accounts[1], 100));
            });
        });

        describe('after minting', function () {
            beforeEach(async function () {
                await token.finishMinting();
            });

            it('should return the correct allowance amount after approval', async function () {
                await token.approve(accounts[1], 100);
                let allowance = await token.allowance(accounts[0], accounts[1]);
                assert.equal(allowance, 100);
            });

            it('should return correct balances after transfer', async function () {
                await token.transfer(accounts[1], 100);
                let balance0 = await token.balanceOf(accounts[0]);
                assert.equal(balance0, 0);

                let balance1 = await token.balanceOf(accounts[1]);
                assert.equal(balance1, 100);
            });

            it('should throw an error when trying to transfer more than balance', async function () {
                await assertRevert(token.transfer(accounts[1], 101));
            });

            it('should return correct balances after transfering from another account', async function () {
                await token.approve(accounts[1], 100);
                await token.transferFrom(accounts[0], accounts[2], 100, { from: accounts[1] });

                let balance0 = await token.balanceOf(accounts[0]);
                assert.equal(balance0, 0);

                let balance1 = await token.balanceOf(accounts[2]);
                assert.equal(balance1, 100);

                let balance2 = await token.balanceOf(accounts[1]);
                assert.equal(balance2, 0);
            });

            it('should throw an error when trying to transfer more than allowed', async function () {
                await token.approve(accounts[1], 99);
                await assertRevert(token.transferFrom(accounts[0], accounts[2], 100, { from: accounts[1] }));
            });

            it('should throw an error when trying to transferFrom more than _from has', async function () {
                let balance0 = await token.balanceOf(accounts[0]);
                await token.approve(accounts[1], 99);
                await assertRevert(token.transferFrom(accounts[0], accounts[2], balance0 + 1, { from: accounts[1] }));
            });

            describe('validating allowance updates to spender', function () {
                let preApproved;

                it('should start with zero', async function () {
                    preApproved = await token.allowance(accounts[0], accounts[1]);
                    assert.equal(preApproved, 0);
                });

                it('should increase by 50 then decrease by 10', async function () {
                    await token.increaseApproval(accounts[1], 50);
                    let postIncrease = await token.allowance(accounts[0], accounts[1]);
                    preApproved.plus(50).should.be.bignumber.equal(postIncrease);
                    await token.decreaseApproval(accounts[1], 10);
                    let postDecrease = await token.allowance(accounts[0], accounts[1]);
                    postIncrease.minus(10).should.be.bignumber.equal(postDecrease);
                });
            });

            it('should increase by 50 then set to 0 when decreasing by more than 50', async function () {
                await token.approve(accounts[1], 50);
                await token.decreaseApproval(accounts[1], 60);
                let postDecrease = await token.allowance(accounts[0], accounts[1]);
                postDecrease.should.be.bignumber.equal(0);
            });

            it('should throw an error when trying to transfer to 0x0', async function () {
                await assertRevert(token.transfer(0x0, 100));
            });

            it('should throw an error when trying to transferFrom to 0x0', async function () {
                await token.approve(accounts[1], 100);
                await assertRevert(token.transferFrom(accounts[0], 0x0, 100, { from: accounts[1] }));
            });
        });
    });

    describe('should have additional functions works as expected', function () {
        it('should call receiveApproval on contract after approveAndCall', async function () {
            let token = await FriendsFingersToken.new(obj.name, obj.symbol, obj.decimals);

            const auxContract = await ContractReceiverImpl.new();

            await token.mint(accounts[0], 100);
            await token.finishMinting();

            let balance0 = await token.balanceOf(accounts[0]);
            assert.equal(balance0, 100);
            let balance1 = await token.balanceOf(auxContract.address);
            assert.equal(balance1, 0);

            await token.approveAndCall(auxContract.address, 100, "test");

            balance0 = await token.balanceOf(accounts[0]);
            assert.equal(balance0, 0);
            balance1 = await token.balanceOf(auxContract.address);
            assert.equal(balance1, 100);

            const data = await auxContract.data();
            assert.equal(web3.toAscii(data), "test");
        });

        it('should fail to transfer ETH into the token contract', async function () {
            let token = await FriendsFingersToken.new(obj.name, obj.symbol, obj.decimals);
            await assertRevert(token.send(web3.toWei('1', 'ether')));
        });
    });

    describe('recover ERC20 tokens', function () {
        it('should safe transfer tokens to beneficiary if sent into the contract', async function () {
            const token1 = await FriendsFingersToken.new(obj.name, obj.symbol, obj.decimals);
            const token2 = await FriendsFingersToken.new(obj.name, obj.symbol, obj.decimals);

            await token2.mint(token1.address, 200);
            await token2.finishMinting();

            let balanceContract = await token2.balanceOf(token1.address);
            assert.equal(balanceContract, 200);
            let balanceBeneficiary = await token2.balanceOf(accounts[1]);
            assert.equal(balanceBeneficiary, 0);

            await token1.transferAnyERC20Token(token2.address, 30, accounts[1]);

            balanceContract = await token2.balanceOf(token1.address);
            assert.equal(balanceContract, 170);
            balanceBeneficiary = await token2.balanceOf(accounts[1]);
            assert.equal(balanceBeneficiary, 30);
        });
    });
});