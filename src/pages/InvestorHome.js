import { useEffect, useState, useRef } from "react";
import {
  Wallet,
  Client,
  AccountSetAsfFlags,
  convertHexToString,
  xrpToDrops,
} from "xrpl";
import axios from "axios";
import { useAuthStore } from "../stores";
import "../App.css";

function InvestorHome() {
  const [wallet, updateWallet] = useAuthStore((state) => [
    state.wallet,
    state.updateWallet,
  ]);

  const [mnemonic, setMnemonic] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [xrpBalance, setXrpBalance] = useState(0);
  const [poolAddress, setPoolAddress] = useState("");
  const [poolBalance, setPoolBalance] = useState(0);

  const buttonRef = useRef(null);

  const submitKey = async () => {
    const submittedWallet = Wallet.fromMnemonic(mnemonic);

    console.log(submittedWallet);
    updateWallet(submittedWallet);
  };

  const deposit = async () => {
    try {
      buttonRef.current.classList.remove("active");
      const client = new Client("wss://xls20-sandbox.rippletest.net:51233");
      await client.connect();

      const txBlob = {
        TransactionType: "Payment",
        Account: wallet.classicAddress,
        Amount: xrpToDrops(depositAmount),
        Destination: poolAddress,
      };

      const response = await client.submitAndWait(txBlob, { wallet });
      console.log(response.result.meta.TransactionResult);
      setDepositAmount(0);
    } catch (error) {
      console.log(error);
    }
  };

  // gets balance
  useEffect(() => {
    const getXrpBalance = async () => {
      let client;
      try {
        client = new Client("wss://xls20-sandbox.rippletest.net:51233");
        await client.connect();

        const balance =
          (
            await client.request({
              command: "account_info",
              account: wallet.address,
              ledger_index: "validated",
            })
          ).result.account_data.Balance / 1_000_000;

        setXrpBalance(balance);
      } catch (error) {
        console.log(error.message);
        if (error.message === "Account not found.") {
          // TODO: Can remove in production
          await client.fundWallet(wallet, {
            faucetHost: null,
            amount: "30000",
          });
        }
      }
    };

    if (wallet) {
      getXrpBalance();
    }
  }, [wallet]);

  // gets pool size
  useEffect(() => {
    const getPoolBalance = async () => {
      try {
        const client = new Client("wss://xls20-sandbox.rippletest.net:51233");
        await client.connect();

        const pool = (await axios.get("/api/v1/receivable/pool")).data.address;

        const balance =
          (
            await client.request({
              command: "account_info",
              account: pool,
              ledger_index: "validated",
            })
          ).result.account_data.Balance / 1_000_000;

        setPoolBalance(balance);
        setPoolAddress(pool);
      } catch (error) {
        console.log(error);
      }
    };
    getPoolBalance();
  }, []);

  useEffect(() => {
    if (depositAmount >= 0 && buttonRef.current) {
      buttonRef.current.classList.add("active");
    } else if (buttonRef.current) {
      buttonRef.current.classList.remove("active");
    }
  }, [depositAmount]);

  return (
    <div className="investor-container">
      {wallet ? (
        <div className="investor-contents-wrapper">
          <div className="data">
            <div className="header">
              <div
                className="header-box"
                style={{ borderRight: "1px solid #E0E0E0" }}
              >
                <div>Balance</div>
              </div>
              <div
                className="header-box"
                style={{ borderRight: "1px solid #E0E0E0" }}
              >
                <div>Funds</div>
              </div>
              <div className="header-box">
                <div>Pool Size</div>
              </div>
            </div>

            <div className="values">
              <div className="value-box">
                <img src="xrp.png" className="logo" alt="" />
                <div>{xrpBalance}</div>
              </div>
              <div className="value-box">
                <img src="xrp.png" className="logo" alt="" />
                <div>32,180</div>
              </div>
              <div className="value-box">
                <img src="xrp.png" className="logo" alt="" />
                <div>{poolBalance}</div>
              </div>
            </div>
          </div>

          <div className="pool-actions">
            <div className="deposit-container">
              <div id="amount">Amount</div>
              <div className="action">
                <input
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="34502.10"
                />
                <div className="button" ref={buttonRef} onClick={deposit}>
                  Deposit
                </div>
              </div>
            </div>
            <div className="horizontal-line"></div>
            <div className="withdraw-container">
              <div className="button">Withdraw</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="action-container">
          <div className="action-header">
            Enter your mnemonic to enter the platform. It will NOT leave this
            personal device.
          </div>
          <input
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
          />

          <div
            className="button"
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
            onClick={submitKey}
          >
            Enter
          </div>
        </div>
      )}
    </div>
  );
}

export default InvestorHome;
