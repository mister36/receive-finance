import { useEffect, useState, useRef } from "react";
import {
  Wallet,
  Client,
  AccountSetAsfFlags,
  convertHexToString,
  xrpToDrops,
  dropsToXrp,
} from "xrpl";
import axios from "axios";
import { useAuthStore } from "../stores";
import "../App.css";

function InvestorHome() {
  const [mnemonic, updateWallet] = useAuthStore((state) => [
    state.mnemonic,
    state.updateWallet,
  ]);

  const [mnemonicInput, setMnemonicInput] = useState("");
  const [wallet, setWallet] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [xrpBalance, setXrpBalance] = useState(0);
  const [totalPosition, setTotalPosition] = useState(0);
  const [totalWithdrawableAmount, setTotalWithdrawableAmount] = useState(0);
  const [poolAddress, setPoolAddress] = useState("");
  const [poolBalance, setPoolBalance] = useState(0);
  const [reload, setReload] = useState(0);

  const buttonRef = useRef(null);

  const submitKey = async () => {
    updateWallet(mnemonicInput);
    setWallet(Wallet.fromMnemonic(mnemonicInput));
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
      setReload((current) => current + 1);
    } catch (error) {
      console.log(error);
    }
  };

  // sets wallet from mnemonic
  useEffect(() => {
    if (
      mnemonic.split(" ").length === 12 ||
      mnemonic.split(" ").length === 15
    ) {
      setWallet(Wallet.fromMnemonic(mnemonic));
      console.log(wallet);
    }
  }, [mnemonic]);

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
              account: wallet.classicAddress,
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
  }, [wallet, reload]);

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
  }, [reload]);

  // gets incoming entitles
  useEffect(() => {
    const getEntitles = async () => {
      try {
        const client = new Client("wss://xls20-sandbox.rippletest.net:51233");
        await client.connect();

        const offers = (
          await axios.post("/api/v1/investors/offers", {
            investor: wallet.classicAddress,
          })
        ).data.offers;

        if (offers.length) {
          console.log("offers:", offers);
          // accepts sell offers
          await Promise.all(
            offers.map(async (offer) => {
              try {
                const txBlob = {
                  TransactionType: "NFTokenAcceptOffer",
                  Account: wallet.classicAddress,
                  NFTokenSellOffer: offer,
                  LastLedgerSequence: null,
                };

                const tx = await client.submitAndWait(txBlob, { wallet });
                console.log(tx.result);
                console.log(tx.result.meta.TransactionResult);
              } catch (error) {
                console.log(error);
              }
            })
          );

          // deletes sell offers from db
          const response = await axios.post("/api/v1/investors/offers/remove", {
            investor: wallet.classicAddress,
          });
          console.log(response.data);

          setReload((current) => current + 1);
        }

        const nfts = (
          await client.request({
            command: "account_nfts",
            account: wallet.classicAddress,
            ledger_index: "validated",
          })
        ).result.account_nfts;

        console.log("entitled nfts:", nfts);

        let total = 0;
        let totalWithdrawable = 0;

        nfts.forEach((nft) => {
          const meta = JSON.parse(convertHexToString(nft.URI));
          console.log(meta);

          total += meta.entitledTo;

          if (meta.date < Math.round(Date.now() / 1000)) {
            totalWithdrawable += meta.entitledTo;
          }
        });

        const deposit =
          (
            await axios.post("/api/v1/investors/deposit", {
              investor: wallet.classicAddress,
            })
          ).data.amount || 0;

        setTotalPosition(dropsToXrp(Math.round(deposit + total)));
        setTotalWithdrawableAmount(
          dropsToXrp(Math.round(deposit + totalWithdrawable))
        );
      } catch (error) {
        console.log(error);
      }
    };

    if (wallet) {
      getEntitles();
    }
  }, [wallet, reload]);

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
                <div>Total Position</div>
              </div>
              <div
                className="header-box"
                style={{ borderRight: "1px solid #E0E0E0" }}
              >
                <div style={{ width: "75%" }}>Total Withdrawable Amount</div>
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
                <div>{totalPosition}</div>
              </div>
              <div className="value-box">
                <img src="xrp.png" className="logo" alt="" />
                <div>{totalWithdrawableAmount}</div>
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
            value={mnemonicInput}
            onChange={(e) => setMnemonicInput(e.target.value)}
          />

          <div className="button" onClick={submitKey}>
            Enter
          </div>
        </div>
      )}
    </div>
  );
}

export default InvestorHome;
