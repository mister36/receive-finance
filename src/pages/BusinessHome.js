import { useState, useEffect, useRef } from "react";
import {
  Wallet,
  Client,
  AccountSetAsfFlags,
  convertHexToString,
  dropsToXrp,
  xrpToDrops,
} from "xrpl";
import Popup from "reactjs-popup";
import { TypeAnimation } from "react-type-animation";
import axios from "axios";
import Select from "react-select";
import { generateMnemonic } from "bip39";
import ContentLoader, { Facebook } from "react-content-loader";
import { useAuthStore } from "../stores";
import Receivable from "../components/Receivable";
import "reactjs-popup/dist/index.css";
import "../App.css";

axios.defaults.withCredentials = true;

const RECEIVABLE_FEE = 0.02;

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const usdToXrp = (usd) => usd * 2.54;
const xrpToUsd = (xrp) => xrp / 2.54;

const selectStyles = {
  control: (baseStyles, state) => ({
    ...baseStyles,
    width: "432px",
    backgroundColor: "#2f2f2f",
    fontFamily: "HeroNewRegular",
    borderColor: state.isFocused ? "#2f2f2f" : "#fff",
    boxShadow: "none",
  }),
  option: (baseStyles) => ({
    ...baseStyles,
    backgroundColor: "#2f2f2f",
    borderColor: "#2f2f2f",
    color: "rgba(255, 255, 255, 0.7)",
  }),
  menuList: (baseStyles) => ({
    ...baseStyles,
    backgroundColor: "#2f2f2f",
  }),
  singleValue: (baseStyles) => ({
    ...baseStyles,
    color: "#fff",
  }),
};

function convertTwoDecimals(num) {
  return num.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0];
}

const MyLoader = () => (
  <ContentLoader
    viewBox="0 0 445 217.5"
    backgroundColor="white"
    backgroundOpacity={0.1}
    foregroundColor="white"
    foregroundOpacity={0.2}
    style={{
      width: "455px",
      height: "220.5px",
      padding: "5px",
      borderRadius: "10px",
      transform: "translateX(-6px)",
    }}
  >
    {/* Only SVG shapes */}
    <rect x="0" y="0" rx="10" ry="10" width="445" height="217.5" />
  </ContentLoader>
);

function BusinessHome() {
  const [
    mnemonic,
    updateWallet,
    hasWallet,
    updateWalletStatus,
    businessName,
    updateBusinessName,
  ] = useAuthStore((state) => [
    state.mnemonic,
    state.updateWallet,
    state.hasWallet,
    state.updateWalletStatus,
    state.businessName,
    state.updateBusinessName,
    state.jwtToken,
  ]);

  const buttonRef = useRef(null);

  const [keyPopupOpen, setKeyPopupOpen] = useState(false);
  const [createPopupOpen, setCreatePopupOpen] = useState(false);
  const [wallet, setWallet] = useState("");
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [businessDropdownData, setBusinessDropdownData] = useState([]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [business, setBusiness] = useState();
  const [xrpBalance, setXrpBalance] = useState(0);
  const [poolBalance, setPoolBalance] = useState(0);
  const [inReceivables, setInReceivables] = useState([]);
  const [checks, setChecks] = useState([]);
  const [amountOwed, setAmountOwed] = useState(0);
  const [amountDue, setAmountDue] = useState(0);
  const [net, setNet] = useState(0);
  const [reload, setReload] = useState(0);
  const [checksLoaded, setChecksLoaded] = useState(false);
  const [receivablesLoaded, setReceivablesLoaded] = useState(false);
  const [createReceivableClicked, setCreateReceivableClicked] = useState(false);

  const generateWallet = async () => {
    const newMnemonic = generateMnemonic();
    const newWallet = Wallet.fromMnemonic(newMnemonic);
    updateWallet(newMnemonic);
    setWallet(newWallet);

    try {
      const client = new Client("wss://xls20-sandbox.rippletest.net:51233");
      await client.connect();

      let response = await client.fundWallet(newWallet, {
        faucetHost: null,
        amount: "30000",
      });

      console.log(response);

      response = await axios.post("/api/v1/auth/wallet/update", {
        address: newWallet.classicAddress,
      });

      updateWalletStatus();

      console.log(response);
      console.log(newWallet);
    } catch (error) {
      console.log(error);
    }
  };

  const submitKey = async () => {
    updateWallet(mnemonicInput);
    setWallet(Wallet.fromMnemonic(mnemonicInput));
  };

  const createReceivable = async () => {
    if (createReceivableClicked) {
      return;
    }

    setCreateReceivableClicked(true);
    buttonRef.current.classList.add("inactive");

    const dateNum = Math.floor(new Date(date).getTime() / 1000);

    try {
      const client = new Client("wss://xls20-sandbox.rippletest.net:51233");
      await client.connect();

      // sends check to receive pool
      const poolAddress = (await axios.get("/api/v1/receivable/pool")).data
        .address;
      const txBlob = {
        TransactionType: "CheckCreate",
        Account: wallet.classicAddress,
        Destination: poolAddress,
        SendMax: xrpToDrops(usdToXrp(parseFloat(amount, 10)).toString(10)),
        SourceTag: dateNum, // when  check will be used
        LastLedgerSequence: null,
      };

      const tx = await client.submitAndWait(txBlob, {
        wallet,
      });
      console.log("result;", tx.result);
      console.log(tx.result.meta.TransactionResult);

      // creates receivable
      const response = await axios.post("/api/v1/receivable/new", {
        businessAddress: business,
        amount: xrpToDrops(usdToXrp(amount)),
        date: dateNum,
      });

      console.log(response.data);

      setCreatePopupOpen(false);
      setBusiness("");
      setAmount("");
      setDate("");
      setReload((current) => current + 1);
      setCreateReceivableClicked(false);
    } catch (error) {
      console.log(error);
      setCreateReceivableClicked(false);
    }
  };

  const createSellOffer = async (NFTokenID, Amount) => {
    try {
      const client = new Client("wss://xls20-sandbox.rippletest.net:51233");
      await client.connect();

      const pool = (await axios.get("/api/v1/receivable/pool")).data.address;

      const txBlob = {
        TransactionType: "NFTokenCreateOffer",
        Account: wallet.classicAddress,
        NFTokenID,
        Amount: (Amount * (1 - RECEIVABLE_FEE)).toString(10),
        Destination: pool,
        Flags: 1,
        LastLedgerSequence: 10_000_000,
      };

      const tx = await client.submitAndWait(txBlob, { wallet });
      console.log(tx.result.meta.TransactionResult);
      setReload((current) => current + 1);
    } catch (error) {
      console.log(error);
    }
  };

  // sets wallet from mnemonic
  useEffect(() => {
    if (mnemonic.split(" ").length === 12) {
      setWallet(Wallet.fromMnemonic(mnemonic));
      console.log(wallet);
    }
  }, [mnemonic]);

  // gets user's business name
  useEffect(() => {
    const getName = async () => {
      try {
        const name = (await axios.get("/api/v1/auth/name")).data.name;
        updateBusinessName(name);
      } catch (error) {
        console.log(error);
      }
    };
    getName();
  }, []);

  // wallet status
  useEffect(() => {
    const checkWalletStatus = async () => {
      try {
        const response = await axios.get("/api/v1/auth/wallet");

        if (response.data.xrpAddress) {
          updateWalletStatus();
        }
      } catch (error) {
        console.log(error);
      }
    };
    checkWalletStatus();
  }, []);

  // gets businesses for dropdown
  useEffect(() => {
    const getBusinesses = async () => {
      const response = await axios.get("/api/v1/businesses");

      setBusinessDropdownData(response.data.businesses);
    };

    if (createPopupOpen) {
      getBusinesses();
    }
  }, [createPopupOpen]);

  // gets balance
  useEffect(() => {
    const getXrpBalance = async () => {
      try {
        const client = new Client("wss://xls20-sandbox.rippletest.net:51233");
        await client.connect();

        const balance = dropsToXrp(
          (
            await client.request({
              command: "account_info",
              account: wallet.classicAddress,
              ledger_index: "validated",
            })
          ).result.account_data.Balance
        );

        setXrpBalance(balance);
      } catch (error) {
        console.log(error);
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

        const poolAddress = (await axios.get("/api/v1/receivable/pool")).data
          .address;

        const balance = dropsToXrp(
          (
            await client.request({
              command: "account_info",
              account: poolAddress,
              ledger_index: "validated",
            })
          ).result.account_data.Balance
        );

        setPoolBalance(balance);
      } catch (error) {
        console.log(error);
      }
    };
    getPoolBalance();
  }, [reload]);

  // gets incoming Receivables
  useEffect(() => {
    const getReceivables = async () => {
      try {
        const client = new Client("wss://xls20-sandbox.rippletest.net:51233");
        await client.connect();

        let response = await axios.get("/api/v1/receivable/sellOffers");
        console.log(response.data);
        const sellOffers = response.data.sellOffers;

        if (sellOffers.length) {
          // accepts sell offers
          await Promise.all(
            sellOffers.map(async (offer) => {
              try {
                const txBlob = {
                  TransactionType: "NFTokenAcceptOffer",
                  Account: wallet.classicAddress,
                  NFTokenSellOffer: offer,
                  LastLedgerSequence: 10_000_000,
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
          response = await axios.delete("/api/v1/receivable/sellOffers");
          console.log(response.data);
        }

        const nfts = (
          await client.request({
            command: "account_nfts",
            account: wallet.classicAddress,
            ledger_index: "validated",
          })
        ).result.account_nfts;

        console.log("receivable nfts:", nfts);

        setInReceivables([]);
        setAmountOwed(0);

        await Promise.all(
          nfts.map(async (nft) => {
            const cid = convertHexToString(nft.URI);
            try {
              const metadata = (
                await axios.post("/api/v1/ipfs", {
                  cid,
                })
              ).data;
              console.log(metadata);

              setInReceivables((current) => [
                ...current,
                { ...metadata, id: nft.NFTokenID },
              ]);
              setAmountOwed(
                (current) =>
                  current +
                  xrpToUsd(parseFloat(dropsToXrp(metadata.amount)), 10)
              );
            } catch (error) {
              console.log(error);
            }
          })
        )
          .then(() => {
            setReceivablesLoaded(true);
          })
          .catch(() => setReceivablesLoaded(true));
      } catch (error) {
        console.log(error);
      }
    };

    if (wallet) {
      getReceivables();
    }
  }, [wallet, reload]);

  // gets sent receivables (xrpl check)
  useEffect(() => {
    const getChecks = async () => {
      const client = new Client("wss://xls20-sandbox.rippletest.net:51233");
      await client.connect();

      const response = await client.request({
        command: "account_objects",
        account: wallet.classicAddress,
        ledger_index: "validated",
        type: "check",
      });

      const respChecks = response.result.account_objects;
      console.log("checks:", respChecks);

      setChecks([]);
      setAmountDue(0);

      respChecks.forEach((checkObj) => {
        setChecks((current) => [
          ...current,
          { amount: checkObj.SendMax, due: checkObj.SourceTag },
        ]);

        setAmountDue(
          (current) =>
            current + xrpToUsd(parseFloat(dropsToXrp(checkObj.SendMax, 10)))
        );
      });

      setChecksLoaded(true);
    };

    if (wallet) {
      getChecks();
    }
  }, [wallet, reload]);

  // calculates net account
  useEffect(() => {
    setNet(amountOwed - amountDue);
  }, [amountOwed, amountDue, reload]);

  return (
    <div className="business-container">
      <div className="header">Dashboard - {businessName}</div>

      {hasWallet && mnemonic && !keyPopupOpen ? (
        <div className="dashboard">
          <div className="left">
            <div className="header">Receivables</div>

            <div className="receivable-container">
              <div className="out">
                <div className="header">Out</div>

                {checksLoaded ? (
                  <div className="receivables-box">
                    <div className="receivables-wrapper">
                      {checks.map((check) => {
                        return (
                          <Receivable
                            type="out"
                            date={new Date(check.due * 1000)}
                            amount={xrpToUsd(
                              dropsToXrp(parseFloat(check.amount, 10))
                            )}
                            key={Math.random()}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <MyLoader />
                )}
              </div>

              <div className="horizontal-line"></div>

              <div className="in">
                <div className="header">In</div>

                {receivablesLoaded ? (
                  <div className="receivables-box">
                    <div className="receivables-wrapper">
                      {inReceivables.map((nft) => {
                        return (
                          <Receivable
                            type="in"
                            name={nft.debtor}
                            date={new Date(nft.due * 1000).toLocaleDateString()}
                            amount={xrpToUsd(dropsToXrp(nft.amount))}
                            key={Math.random()}
                            createSellOffer={() =>
                              createSellOffer(nft.id, nft.amount)
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <MyLoader />
                )}
              </div>
            </div>
          </div>
          <div className="right">
            <div className="vertical-line"></div>
            <div className="data-container">
              <div className="entry">
                <div className="sub-header">XRP account balance</div>
                <div className="info-wrapper">
                  <img src="xrp.png" className="logo" alt="" />
                  <div className="info">{convertTwoDecimals(xrpBalance)}</div>
                </div>
              </div>
              <div className="entry">
                <div className="sub-header">Amount owed</div>
                <div className="info" style={{ color: "#22cd2a" }}>
                  +{usdFormatter.format(amountOwed)}
                </div>
              </div>
              <div className="entry">
                <div className="sub-header">Amount due</div>
                <div className="info" style={{ color: "#f24b4b" }}>
                  -{usdFormatter.format(amountDue)}
                </div>
              </div>
              <div className="entry">
                <div className="sub-header">Net</div>
                <div
                  className="info"
                  style={{ color: net >= 0 ? "#22cd2a" : "#f24b4b" }}
                >
                  {usdFormatter.format(net)}
                </div>
              </div>
              <div className="entry">
                <div className="sub-header">Pool size</div>
                <div className="info-wrapper">
                  <img src="xrp.png" className="logo" alt="" />
                  <div className="info">{poolBalance}</div>
                </div>
              </div>
              <div className="button" onClick={() => setCreatePopupOpen(true)}>
                Create receivable
              </div>
            </div>
          </div>
          <Popup
            open={createPopupOpen}
            position="center center"
            modal
            closeOnDocumentClick={false}
            closeOnEscape={false}
            contentStyle={{
              background: "#000",
              borderWidth: 0,
              height: "430px",
              width: "500px",
              padding: "25px",
              borderRadius: "5px",
            }}
          >
            <div className="receivable-modal">
              <div id="cancel" onClick={() => setCreatePopupOpen(false)}>
                X
              </div>
              <div className="row-container">
                <div className="row">
                  <div className="header">Company</div>
                  <Select
                    options={businessDropdownData
                      .filter((val) => val.xrpAddress !== wallet.classicAddress)
                      .map((val) => ({
                        value: val.xrpAddress,
                        label: val.business,
                      }))}
                    placeholder="Select company..."
                    styles={selectStyles}
                    onChange={(e) => setBusiness(e.value)}
                  />
                </div>
                <div className="row">
                  <div className="header">Amount</div>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="45,386.10"
                  />
                </div>
                <div className="row">
                  <div className="header">Due Date (MM-DD-YYYY)</div>
                  <input
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="11-15-2023"
                  />
                </div>
                <div className="row">
                  <div
                    className="button"
                    onClick={createReceivable}
                    ref={buttonRef}
                  >
                    Create
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        </div>
      ) : (
        <>
          <div className="action-container">
            {hasWallet && !mnemonic ? (
              <>
                <div className="action-header">
                  Enter your mnemonic to enter the platform. It will NOT leave
                  this personal device.
                </div>
                <input
                  value={mnemonicInput}
                  onChange={(e) => setMnemonicInput(e.target.value)}
                />

                <div className="button" onClick={submitKey}>
                  Enter
                </div>
              </>
            ) : (
              <>
                <div className="action-header">
                  A wallet is necessary in order to issue and sell receivables.
                  Create one below to begin using Receive Finance.
                </div>
                <div className="button" onClick={() => setKeyPopupOpen(true)}>
                  Generate wallet
                </div>
                <Popup
                  open={keyPopupOpen}
                  position="center center"
                  modal
                  onOpen={generateWallet}
                  closeOnDocumentClick={false}
                  closeOnEscape={false}
                  contentStyle={{
                    background: "#000",
                    borderWidth: 0,
                    height: "275px",
                    width: "500px",
                    padding: "25px",
                    borderRadius: "5px",
                  }}
                >
                  {() => (
                    <div className="private-key-modal">
                      <div className="header">
                        <span id="highlight">SAVE THIS MNEMONIC!</span> This
                        allows you to access your funds and participate on this
                        platform. Failure to do so will mean irreversible loss
                        of funds.
                      </div>

                      <div className="private-key-container">
                        {mnemonic ? (
                          <TypeAnimation
                            sequence={[mnemonic]}
                            cursor={false}
                            speed={80}
                          />
                        ) : null}
                      </div>

                      <div
                        className="button"
                        onClick={() => setKeyPopupOpen(false)}
                      >
                        I saved it
                      </div>
                    </div>
                  )}
                </Popup>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default BusinessHome;
