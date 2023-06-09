# week5Lotto

# Lotto Dapp

The Lotto Dapp is a decentralized application that allows users to participate in a simple lottery game. Users can buy tickets, view the current prize pool, pick a winner (for the owner), purchase tokens, return tokens, withdraw prizes, and perform other relevant actions.

## WalletInfo

### Contract Code 
```
function getWalletInfo() public view returns (address, bool) {
    return (msg.sender, isOwner());
}

```
### FrontEnd
```
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useSigner } from 'wagmi';
import LottoJson from '../assets/Lotto.json';

export default function InstructionsComponent() {
    const { data: signer } = useSigner();
    const [walletAddress, setWalletAddress] = useState('');
    const [isOwner, setIsOwner] = useState(false);

    useEffect(() => {
        const fetchWalletInfo = async () => {
            if (signer) {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, provider);
                const walletInfo = await lottoContract.getWalletInfo();
                setWalletAddress(walletInfo[0]);
                setIsOwner(walletInfo[1]);
            }
        };

        fetchWalletInfo();
    }, [signer]);

    return (
        <div>
            <p>Wallet address: {walletAddress || 'Not connected'}</p>
            <p>{isOwner ? 'You are the owner of this contract' : 'You are a participant'}</p>
        </div>
    );
}
```

## OwnerPanel
```
function OwnerPanel() {
    return <p>You're the owner!.</p>;
}
```

## ParticipantPanel

```
function ParticipantPanel() {
    return <p>You're a participant! Participant-specific controls would go here.</p>;
}
```

## BuyTicket

### FrontEnd
```
function BuyTicket() {
    const { data: signer } = useSigner();
    const [amount, setAmount] = useState(0);

    const buyTicket = async () => {
        if (signer) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, provider.getSigner());
            await approveTokens();
            await lottoContract.betMany(amount);
        }
    }

    return (
        <div>
            <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
            <button onClick={buyTicket}>Buy Tickets</button>
        </div>
    );
}

### Contract 

```
function betMany(uint256 times) external {
    require(times > 0);
    while (times > 0) {
        bet();
        times--;
    }
}

function bet() public whenBetsOpen {
    ownerPool += betFee;
    prizePool += betPrice;
    _slots.push(msg.sender);
    paymentToken.transferFrom(msg.sender, address(this), betPrice + betFee);
}
```



## PickWinner

### Contract 

```
event WinnerLogged(address winner);

function closeLottery() external {
    require(block.timestamp >= betsClosingTime, "Too soon to close");
    require(betsOpen, "Already closed");
    if (_slots.length > 0) {
        uint256 winnerIndex = getRandomNumber() % _slots.length;
        address winner = _slots[winnerIndex];
        prize[winner] += prizePool;
        prizePool = 0;
        emit WinnerLogged(winner);
        winnerAddress = winner;
        delete (_slots);
    }
    betsOpen = false;
}

function getRandomNumber() public view returns (uint256 randomNumber) {
    randomNumber = block.prevrandao;
}
```
### Frontend

```
function PickWinner({ isOwner }) {
    const { data: signer } = useSigner();
    const [winnerAddress, setWinnerAddress] = useState('');

    const pickWinner = async () => {
        if (signer && isOwner) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, provider.getSigner());
            lottoContract.on("WinnerLogged", (winner) => {
                setWinnerAddress(winner);
            });
            const winner = await lottoContract.winnerAddress();

            try {
                const transaction = await lottoContract.closeLottery();
                const receipt = await transaction.wait();
                console.log(receipt);
            } catch (error) {
                console.error("Error calling closeLottery: ", error);
            }
        }
    }

    return (
        <div>
            <button onClick={pickWinner} disabled={!isOwner}>Pick Winner</button>
            {winnerAddress && <p>Winner: {winnerAddress}</p>}
        </div>
    );
}

```


## ViewPot

### Contract 

```
uint256 public prizePool;

function prizePool() external view returns (uint256) {
    return prizePool;
}
```

### FrontEnd
```
function ViewPot() {
    const [prizePool, setPrizePool] = useState(0);

    useEffect(() => {
        const getPrizePool = async () => {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, provider);
            const pool = await lottoContract.prizePool();
            setPrizePool(pool);
        };

        getPrizePool();
    }, []);

    return (
        <div>
            <p>Current Prize Pool: {prizePool}</p>
        </div>
    );
}
```

### ViewOwnerPot

### Contract

```
uint256 public ownerPool;

function ownerPool() external view returns (uint256) {
    return ownerPool;
}
```

### Frontend 

```
function ViewOwnerPot() {
    const [ownerPool, setOwnerPool] = useState(0);

    useEffect(() => {
        const getOwnerPool = async () => {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, provider);
            const pool = await lottoContract.ownerPool();
            setOwnerPool(pool);
        };

        getOwnerPool();
    }, []);

    return (
        <div>
            <p>Current Owner Pool: {ownerPool}</p>
        </div>
    );
}
## PurchaseTokens

### Contract
```
function purchaseTokens() external payable {
    paymentToken.mint(msg.sender, msg.value * purchaseRatio);
}
```
### FrontEnd

```
function PurchaseTokens() {
    const { data: signer } = useSigner();
    const [amount, setAmount] = useState(0);

    const purchaseTokens = async () => {
        if (signer) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, provider.getSigner());
            await lottoContract.purchaseTokens({ value: ethers.utils.parseEther(amount.toString()) });
        }
    }

    return (
        <div>
            <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
            <button onClick={purchaseTokens}>Buy Tokens</button>
        </div>
    );
}
```



Allows users to purchase tokens by submitting a specified amount of ETH.

## ReturnTokens

### Contract 
```
function returnTokens(uint256 amount) external {
    paymentToken.burnFrom(msg.sender, amount);
    payable(msg.sender).transfer(amount / purchaseRatio);
}
```
### FrontEnd

```
function ReturnTokens() {
    const { data: signer } = useSigner();
    const [amount, setAmount] = useState(0);

    const returnTokens = async () => {
        if (signer) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, provider.getSigner());
            await approveTokens();
            await lottoContract.returnTokens(ethers.utils.parseEther(amount.toString()));
        }
    }

    return (
        <div>
            <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
            <button onClick={returnTokens}>Return Tokens</button>
        </div>
    );
}
```

.

## PrizeWithdraw

### Conract 

```
function prizeWithdraw(uint256 amount) external {
    require(amount <= prize[msg.sender], "Not enough prize");
    prize[msg.sender] -= amount;
    paymentToken.transfer(msg.sender, amount);
}
```
###FrontEnd

```
function PrizeWithdraw() {
    const { data: signer } = useSigner();
    const [amount, setAmount] = useState(0);

    const prizeWithdraw = async () => {
        if (signer) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, provider.getSigner());
            await lottoContract.prizeWithdraw(ethers.utils.parseEther(amount.toString()));
        }
    }

    return (
        <div>
            <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
            <button onClick={prizeWithdraw}>Withdraw Prize</button>
        </div>
    );
}
```


## OwnerWithdraw

### Contract 

```
function ownerWithdraw(uint256 amount) external onlyOwner {
    require(amount <= ownerPool, "Not enough fees collected");
    ownerPool -= amount;
    paymentToken.transfer(msg.sender, amount);
}
```

### FrontEnd

```
function OwnerWithdraw() {
    const { data: signer } = useSigner();
    const [amount, setAmount] = useState(0);

    const ownerWithdraw = async () => {
        if (signer) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, provider.getSigner());
            await lottoContract.ownerWithdraw(ethers.utils.parseEther(amount.toString()));
        }
    }

    return (
        <div>
            <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
            <button onClick={ownerWithdraw}>Owner Withdraw</button>
        </div>
    );
}
```



## OpenBets

### Contract 

```
function openBets(uint256 closingTime) external onlyOwner whenBetsClosed {
    require(closingTime > block.timestamp, "Closing time must be in the future");
    betsClosingTime = closingTime;
    betsOpen = true;
}


```

### FrontEnd

```
function OpenBets({ isOwner }) {
    const [closingTime, setClosingTime] = useState(0);
    const [timeLeft, setTimeLeft] = useState('');

    const openBets = async () => {
        if (isOwner) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, signer);

            const currentTimestamp = Math.floor(Date.now() / 1000);
            const futureClosingTime = currentTimestamp + parseInt(closingTime, 10);

            await lottoContract.openBets(futureClosingTime);
            setClosingTime(futureClosingTime);
            console.log('Bets opened successfully!');
        }
    };

    useEffect(() => {
        if (closingTime > 0) {
            const timer = setInterval(() => {
                const now = Math.floor(Date.now() / 1000);
                const timeRemaining = closingTime - now;

                if (timeRemaining <= 0) {
                    setTimeLeft('Betting time is over!');
                    clearInterval(timer);
                } else {
                    const hours = Math.floor(timeRemaining / 3600);
                    const minutes = Math.floor((timeRemaining % 3600) / 60);
                    const seconds = Math.floor(timeRemaining % 60);
                    setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
                }
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [closingTime]);

    return (
        <div>
            <input
                type="number"
                min="0"
                value={closingTime}
                onChange={(e) => setClosingTime(parseInt(e.target.value, 10))}
            />
            <button onClick={openBets} disabled={!isOwner}>
                Open Bets
            </button>
            <p>{timeLeft}</p>
        </div>
    );
}

```

## CloseBets

### Contract 
```
function closeLottery() external {
    require(block.timestamp >= betsClosingTime, "Too soon to close");
    require(betsOpen, "Already closed");
    // ... rest of the code ...
    betsOpen = false;
}

```

### FrontEnd

```
function CloseBets({ isOwner }) {
    const closeBets = async () => {
        if (isOwner) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, signer);

            await lottoContract.closeLottery();
            console.log('Bets closed successfully!');
        }
    };

    return (
        <div>
            <button onClick={closeBets} disabled={!isOwner}>
                Close Bets
            </button>
        </div>
    );
}

```

## Usage

1. Connect your wallet to the Dapp.
2. View your wallet address and the status (owner/participant).
3. Interact with the specific controls and information based on your role.
4. Purchase tickets, view the prize pool, pick a winner, purchase tokens, return tokens, withdraw prizes, or perform other relevant actions as applicable.
