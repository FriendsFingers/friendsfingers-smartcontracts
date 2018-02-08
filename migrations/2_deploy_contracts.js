let FriendsFingersBuilder = artifacts.require("./FriendsFingersBuilder.sol");

module.exports = function(deployer, network, accounts) {

    const friendsFingersWallet = accounts[0];
    deployer.deploy(FriendsFingersBuilder, friendsFingersWallet);
};