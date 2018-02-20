```
truffle(develop)> test
Using network 'develop'.

  Contract: FriendsFingersBuilder
    creating a valid builder
      ✓ should fail with 0x0 wallet address (71ms)
      ✓ should success with valid wallet address (490ms)
    start a crowdsale
      ✓ first crowdsale should start as unpaused
      ✓ later crowdsale should start as paused (238ms)
      ✓ crowdsale wallet should have the initial supply
      ✓ count should be 1
      ✓ crowdsale list should be updated
      ✓ creator list should be updated
      ✓ crowdsale owner should be builder address
      ✓ crowdsale should be token owner
    restart crowdsale
      goal reached
        ✓ should fail with rate equal or greater than old rate (236ms)
        ✓ builder owner should success to restart crowdsale (319ms)
        ✓ crowdsale creator should success to restart crowdsale (330ms)
        ✓ any other user should fail to restart crowdsale (209ms)
        ✓ cannot be restarted and then closed (343ms)
        ✓ cannot be closed and then restarted (307ms)
        ✓ cannot be restarted twice (526ms)
        ✓ cannot be restarted more than 5 times (2431ms)
        all values after restart should be right set
          ✓ new crowdsale rate should be less than old rate
          ✓ new crowdsale wallet should be the same of the old one (61ms)
          ✓ new crowdsale previous round id should be old crowdsale id (38ms)
          ✓ old crowdsale next round id should be new crowdsale id
          ✓ new crowdsale goal should be zero
          ✓ new crowdsale round should be old crowdsale round plus one
      goal not reached
        ✓ should fail to restart crowdsale (143ms)
    close crowdsale
      ✓ builder owner should success to close crowdsale (167ms)
      ✓ crowdsale creator should success to close crowdsale (121ms)
      ✓ any other user should fail to close crowdsale (71ms)
      ✓ should close minting and transfer token ownership (190ms)
    paused
      ✓ should fail to start crowdsale if paused and then success if unpaused (219ms)
      ✓ should fail to restart crowdsale if paused and then success if unpaused (1289ms)
    utilities for crowdsale
      safe withdraw
        ✓ builder owner should fail to safe withdraw before a year after the end time (451ms)
        ✓ enabled address should fail to safe withdraw before a year after the end time (509ms)
        ✓ builder owner should safe withdraw after a year (1027ms)
        ✓ enabled address should safe withdraw after a year (1009ms)
        ✓ other users shouldn't safe withdraw after a year (554ms)
      set expired
        ✓ builder owner should fail to set expired and withdraw after a year if not refunding (872ms)
        ✓ enabled address should fail to set expired and withdraw after a year if not refunding (1079ms)
        ✓ builder owner should fail to set expired and withdraw before a year after the end time (832ms)
        ✓ enabled address should fail to set expired and withdraw before a year after the end time (835ms)
        ✓ builder owner should set expired and withdraw after a year if people have not claimed (1209ms)
        ✓ enabled address should set expired and withdraw after a year if people have not claimed (1396ms)
        ✓ other users should't set expired and withdraw after a year if people have not claimed (868ms)
      block campaign
        ✓ builder owner should block an active campaign (74ms)
        ✓ enabled address should block an active campaign (103ms)
        ✓ other users shouldn't block an active campaign (112ms)
      change FriendsFingers wallet
        ✓ builder owner should fail to change FriendsFingers wallet if 0x0 (60ms)
        ✓ builder owner should change FriendsFingers wallet if valid address (76ms)
        ✓ other users should't change FriendsFingers wallet if valid address (211ms)
      change FriendsFingers fee
        ✓ builder owner should fail to change FriendsFingers fee if greater than previous (46ms)
        ✓ builder owner should change FriendsFingers fee if less than previous (115ms)
        ✓ other users should't change FriendsFingers fee if less than previous (123ms)
      update crowdsale info
        ✓ builder owner or crowdsale creator should fail to update crowdsale info if ended (209ms)
        ✓ builder owner or crowdsale creator should update crowdsale info if not ended (275ms)
        ✓ other users should't update crowdsale info if not ended
      pause
        ✓ builder owner can pause a crowdsale (72ms)
        ✓ enabled address can pause a crowdsale (235ms)
        ✓ other users creator can't pause a crowdsale (148ms)
      unpause
        ✓ builder owner can unpause a crowdsale (131ms)
        ✓ enabled address can unpause a crowdsale (281ms)
        ✓ other users can't unpause a crowdsale (140ms)
    utilities for builder
      set enabled address
        ✓ builder owner should success to change enabled address status (102ms)
        ✓ enabled address should fail to change his status (97ms)
        ✓ other users should fail to change enabled address status (54ms)
      set default FriendsFingers rate
        ✓ builder owner should fail to change FriendsFingers fee if greater than previous
        ✓ builder owner should change FriendsFingers fee if less than previous (59ms)
        ✓ other users should't change FriendsFingers fee if less than previous (39ms)
      change FriendsFingers main wallet
        ✓ builder owner should fail to change FriendsFingers wallet if 0x0
        ✓ builder owner should change FriendsFingers wallet if valid address (63ms)
        ✓ other users should't change FriendsFingers wallet if valid address
    direct donation
      ✓ should forward funds to builder wallet if direct donation (374ms)
    recover ERC20 tokens
      ✓ should safe transfer tokens to beneficiary if sent into the contract (268ms)
      ✓ owner or enabled address should safe transfer tokens from a crowdsale to builder wallet if sent into the contract (1169ms)

  Contract: FriendsFingersCrowdsale
    creating a valid crowdsale
      ✓ should be token owner
      ✓ should fail with start time in the past (160ms)
      ✓ should fail with end time before start time
      ✓ should fail with end time more than 30 days after start time (40ms)
      ✓ should fail with zero rate (46ms)
      ✓ should fail with 0x0 wallet
      ✓ should fail with zero cap
      ✓ should fail with zero goal
      ✓ should fail with cap under goal
      ✓ should success with zero goal if it is the first crowdsale started (151ms)
      ✓ should fail with 0x0 token address
      ✓ should fail with round greater than 5
    accepting payments
      ✓ should reject payments before start (55ms)
      ✓ should accept payments after start (884ms)
      ✓ should reject payments after end (187ms)
      ✓ should accept payments within cap (250ms)
      ✓ should reject payments outside cap (209ms)
      ✓ should reject payments that exceed cap (267ms)
      ✓ should reject payments if campaign is blocked (249ms)
    high-level purchase
      ✓ should log purchase (91ms)
      ✓ should increase totalSupply (77ms)
      ✓ should assign tokens to sender (106ms)
      ✓ should keep funds into contract (324ms)
    low-level purchase
      ✓ should log purchase (71ms)
      ✓ should increase totalSupply (74ms)
      ✓ should assign tokens to beneficiary (192ms)
      ✓ should keep funds into contract (333ms)
    ending
      ✓ should not be ended if under cap (94ms)
      ✓ should not be ended if just under cap (84ms)
      ✓ should be ended if cap reached (74ms)
      ✓ should not be ended before end
      ✓ should be ended after end (173ms)
    finalizing
      ✓ cannot be finalized before ending
      ✓ cannot be finalized by third party after ending (825ms)
      ✓ can be finalized by owner after ending (433ms)
      ✓ cannot be finalized twice (796ms)
      ✓ logs finalized (326ms)
    refunding
      ✓ should deny refunds before end (513ms)
      ✓ should deny refunds after end if goal was reached (449ms)
      ✓ should allow refunds after end if goal was not reached (1375ms)
    ended
      ✓ should give tokens to crowdsale builder after end (985ms)
      ✓ should forward funds to wallet after end if goal was reached (1940ms)
    paused
      accepting payments
        ✓ should reject payments after start (252ms)
        ✓ should reject payments within cap (358ms)
      refunding
        ✓ should deny refunds after end also if goal was not reached (557ms)
      finalizing
        ✓ cannot be finalized (192ms)
    utility and emergency tools
      safe withdraw
        ✓ owner should fail to safe withdraw before a year after the end time (532ms)
        ✓ owner should safe withdraw after a year (1157ms)
        ✓ third party shouldn't safe withdraw after a year (547ms)
      set expired
        ✓ owner should fail to set expired and withdraw after a year if not refunding (691ms)
        ✓ owner should fail to set expired and withdraw before a year after the end time (900ms)
        ✓ owner should set expired and withdraw after a year if people have not claimed (1191ms)
        ✓ third party shouldn't set expired and withdraw after a year if people have not claimed (904ms)
      block campaign
        ✓ owner should fail to block a campaign if not active (821ms)
        ✓ owner should block an active campaign (176ms)
        ✓ third party shouldn't block an active campaign (41ms)
      change FriendsFingers wallet
        ✓ owner should fail to change FriendsFingers wallet if 0x0
        ✓ owner should change FriendsFingers wallet if valid address (68ms)
        ✓ third party shouldn't change FriendsFingers wallet if valid address
      change FriendsFingers fee
        ✓ owner should fail to change FriendsFingers fee if greater than previous (41ms)
        ✓ owner should change FriendsFingers fee if less than previous (67ms)
        ✓ third party shouldn't change FriendsFingers fee if less than previous (109ms)
      update crowdsale info
        ✓ owner should fail to update crowdsale info if ended (184ms)
        ✓ owner should update crowdsale info if not ended (65ms)
        ✓ third party shouldn't update crowdsale info if not ended
    recover ERC20 tokens
      ✓ should safe transfer tokens to beneficiary if sent into the contract (605ms)

  Contract: FriendsFingersToken
    should have correct values and properties after construction
      ✓ has a name
      ✓ has a symbol
      ✓ has an amount of decimals
      ✓ should start with a totalSupply of 0
      ✓ should return mintingFinished false after construction
    should work as a mintable token
      ✓ should mint a given amount of tokens to a given address (86ms)
      ✓ should fail to mint after call to finishMinting (110ms)
    should work as a burnable token
      ✓ owner should be able to burn tokens (71ms)
      ✓ cannot burn more tokens than your balance (61ms)
    should work as a standard ERC20 token with a can transfer restriction
      during minting
        ✓ should fail to transfer a given amount of tokens to a given address
      after minting
        ✓ should return the correct allowance amount after approval (70ms)
        ✓ should return correct balances after transfer (107ms)
        ✓ should throw an error when trying to transfer more than balance (129ms)
        ✓ should return correct balances after transfering from another account (194ms)
        ✓ should throw an error when trying to transfer more than allowed (139ms)
        ✓ should throw an error when trying to transferFrom more than _from has (155ms)
        ✓ should increase by 50 then set to 0 when decreasing by more than 50 (199ms)
        ✓ should throw an error when trying to transfer to 0x0
        ✓ should throw an error when trying to transferFrom to 0x0 (178ms)
        validating allowance updates to spender
          ✓ should start with zero
          ✓ should increase by 50 then decrease by 10 (307ms)
    should have additional functions working as expected
      ✓ should call receiveApproval on contract after approveAndCall (562ms)
      ✓ should fail to transfer ETH into the token contract (201ms)
    recover ERC20 tokens
      ✓ should safe transfer tokens to beneficiary if sent into the contract (484ms)


  163 passing (3m)
```