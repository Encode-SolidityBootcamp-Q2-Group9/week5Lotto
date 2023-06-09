import React, { useState, useEffect } from 'react';
import styles from "../styles/InstructionsComponent.module.css";
import { ethers, contract } from 'ethers';
import { useSigner } from 'wagmi';
import  LottoJson from '../assets/Lotto.json';
import lottoTokenJson from '../assets/lottoToken.json';

export default function InstructionsComponent() {
	const { data: signer } = useSigner();
	const [betsClosingTime, setBetsClosingTime] = useState(0);
    return (
        <div className={styles.container}>
            <header className={styles.header_container}>
                <h1>Welcome to the Lotto Dapp</h1>
                <p>Group 9</p>
            </header>
            <div className={styles.buttons_container}>
                <PageBody />
            </div>
            <div className={styles.footer}></div>
        </div>
    );
}

function PageBody() {
    const [isOwner, setIsOwner] = useState(false);
	const [address, setAddress] = useState(null);
    const { data: signer } = useSigner();
	useEffect(() => {
        const checkOwner = async () => {
            if (signer) {
                const signerAddress = await signer.getAddress();
                setAddress(signerAddress);
                if (signerAddress) {
                    const provider = new ethers.providers.Web3Provider(window.ethereum);
                    const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, provider);
                    const owner = await lottoContract.owner(); 
                    setIsOwner(ethers.utils.getAddress(signerAddress) === ethers.utils.getAddress(owner));
                }
            }
        };
        checkOwner();
    }, [signer, address]);

    return (
        <>
           <WalletInfo setIsOwner={setIsOwner} isOwner={isOwner} address={address} />
            { isOwner ? <OwnerPanel /> : <ParticipantPanel /> }
            <BuyTicket/>
            <PickWinner isOwner={isOwner} />
            <ViewPot isOwner={isOwner} />
			<ViewOwnerPot isOwner={isOwner} />
			<OpenBets isOwner={isOwner}/>
			<CloseBets isOwner={isOwner} />
            <PurchaseTokens />
            <ReturnTokens />
            <PrizeWithdraw />
            { isOwner ? <OwnerWithdraw /> : null}
        </>
    );
}

function WalletInfo({ setIsOwner, isOwner, address }) {
    return (
        <div>
            <p>Wallet address: {address || 'Not connected'}</p>
            <p>{isOwner ? 'You are the owner of this contract' : 'You are a participant'}</p>
        </div>
    );
}


function OwnerPanel() {
    return <p>You're the owner! Owner-specific controls would go here.</p>
}

function ParticipantPanel() {
    return <p>You're a participant! Participant-specific controls would go here.</p>
}

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
	


function ViewPot({ isOwner }) {
    const [prizePool, setPrizePool] = useState(0);

    useEffect(() => {
        const getPrizePool = async () => {
            const provider = new ethers.providers.InfuraProvider("sepolia", process.env.NEXT_PUBLIC_INFURA_API_KEY);
            const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, provider);
            const prizePool = await lottoContract.prizePool();
			const closingTime = await lottoContract.betsClosingTime(); // Retrieve the closing time
			const formattedPrizePool = ethers.utils.formatUnits(prizePool, 18);
      setPrizePool(formattedPrizePool);
		
		  };
        getPrizePool();
    }, []);

    return (
        <div>
            <p>Current Prize Pool: {prizePool}</p>
        </div>
    );
}
function ViewOwnerPot({ isOwner }) {
    const [ownerPool, setOwnerPool] = useState(0);

    useEffect(() => {
        const getOwnerPool = async () => {
            const provider = new ethers.providers.InfuraProvider("sepolia", process.env.NEXT_PUBLIC_INFURA_API_KEY);
            const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, provider);
            const ownerPool = await lottoContract.ownerPool();
			const closingTime = await lottoContract.betsClosingTime(); // Retrieve the closing time
			const formattedOwnerPool = ethers.utils.formatUnits(ownerPool, 18);
      setOwnerPool(formattedOwnerPool);
		
		  };
        getOwnerPool();
    }, []);

    return (
        <div>
            <p>Current Owner Pool: {ownerPool}</p>
        </div>
    );
}
function PurchaseTokens() {
    const { data: signer } = useSigner();
    const [amount, setAmount] = useState(0);

    const purchaseTokens = async () => {
        if (signer) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, provider.getSigner());
			const overrides = {
                // The maximum units of gas for the transaction to use
                gasLimit: 21000,
            };
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
function OpenBets({ isOwner }) {
	const [closingTime, setBetsClosingTime] = useState(0);
	const [timeLeft, setTimeLeft] = useState('');
  
	const openBets = async () => {
	  if (isOwner) {
		const provider = new ethers.providers.Web3Provider(window.ethereum);
		const signer = provider.getSigner();
		const lottoContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, LottoJson.abi, signer);
	  
		const currentTimestamp = Math.floor(Date.now() / 1000);
		const futureClosingTime = currentTimestamp + parseInt(closingTime, 10);
  
		await lottoContract.openBets(futureClosingTime);
		setBetsClosingTime(futureClosingTime);
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
		  onChange={(e) => setBetsClosingTime(parseInt(e.target.value, 10))}
		/>
		<button onClick={openBets} disabled={!isOwner}>
		  Open Bets
		</button>
		<p>{timeLeft}</p>
	  </div>
	);
  }
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
  
async function approveTokens() {
	const provider = new ethers.providers.Web3Provider(window.ethereum);
	const signer = provider.getSigner();
	const tokenContract = new ethers.Contract(process.env.NEXT_PUBLIC_LOTTERY_TOKEN, lottoTokenJson.abi, signer);
  
	// Convert the desired token amount to the appropriate representation based on the token's decimal places
	const tokenAmount = ethers.utils.parseUnits('1200000000000000000000', 18);
  
	// Approve the lottery contract to spend tokens on your behalf
	await tokenContract.approve(process.env.NEXT_PUBLIC_LOTTERY_CONTRACT, tokenAmount);
  
	console.log('Tokens approved!');
  }