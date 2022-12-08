import { useState, useEffect, useRef } from "react";
import { Wallet, Client, AccountSetAsfFlags, convertHexToString } from "xrpl";
import Popup from "reactjs-popup";
import { TypeAnimation } from "react-type-animation";
import axios from "axios";
import Select from "react-select";
import { generateMnemonic } from "bip39";
import { useAuthStore } from "../stores";
import Receivable from "../components/Receivable";
import "reactjs-popup/dist/index.css";
import "../App.css";

// axios.defaults.withCredentials = true;

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

function BusinessHome() {
  const [wallet, updateWallet, hasWallet, updateWalletStatus] = useAuthStore(
    (state) => [
      state.wallet,
      state.updateWallet,
      state.hasWallet,
      state.updateWalletStatus,
    ]
  );

  const buttonRef = useRef(null);

  const [keyPopupOpen, setKeyPopupOpen] = useState(false);
  const [createPopupOpen, setCreatePopupOpen] = useState(false);
  const [mnemonic, setMnemonic] = useState("");
  const [businessDropdownData, setBusinessDropdownData] = useState([]);
  const [amount, setAmount] = useState();
  const [date, setDate] = useState();
  const [business, setBusiness] = useState();
  const [xrpBalance, setXrpBalance] = useState(0);
  const [poolBalance, setPoolBalance] = useState(0);
  const [inReceivables, setInReceivables] = useState([]);

  const generateWallet = async () => {
    const newMnemonic = generateMnemonic();
    const newWallet = Wallet.fromMnemonic(newMnemonic);
    updateWallet(newWallet);
    setMnemonic(newMnemonic);

    try {
      const client = new Client("wss://xls20-sandbox.rippletest.net:51233");
      await client.connect();

      let response = await axios.get("/api/v1/receivable/address");
      const receivableAddress = response.data.address;

      await client.fundWallet(newWallet, {
        faucetHost: null,
        amount: "30000",
      });

      const txJson = {
        TransactionType: "AccountSet",
        Account: newWallet.address,
        NFTokenMinter: receivableAddress,
        SetFlag: AccountSetAsfFlags.asfAuthorizedNFTokenMinter,
      };

      response = await axios.post("/api/v1/auth/wallet/update", {
        address: newWallet.classicAddress,
      });

      const prepared = await client.autofill(txJson);
      const signed = newWallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      if (result.result.meta.TransactionResult === "tesSUCCESS") {
        console.log("Set minter");
        console.log(result);
      } else {
        throw new Error(`Error setting minter: ${result}`);
      }

      console.log(response);
      console.log(newWallet);
    } catch (error) {
      console.log(error);
    }
  };

  const submitKey = async () => {
    const submittedWallet = Wallet.fromMnemonic(mnemonic);

    console.log(submittedWallet);
    updateWallet(submittedWallet);
  };

  const createReceivable = async () => {
    buttonRef.current.classList.add("inactive");

    const unixTimestamp = Math.floor(new Date(date).getTime() / 1000);
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
        SendMax: amount,
      };
      const tx = await client.submitAndWait(txBlob, { wallet });
      console.log("result;", tx.result);
      console.log(tx.result.meta.TransactionResult);

      // creates receivable
      const response = await axios.post("/api/v1/receivable/new", {
        businessAddress: business,
        amount,
        date: unixTimestamp,
      });

      console.log(response.data);

      setCreatePopupOpen(false);
      setBusiness("");
      setAmount("");
      setDate("");
    } catch (error) {
      console.log(error);
    }
  };

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
        console.log(error);
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

        const poolAddress = (await axios.get("/api/v1/receivable/pool")).data
          .address;

        const balance =
          (
            await client.request({
              command: "account_info",
              account: poolAddress,
              ledger_index: "validated",
            })
          ).result.account_data.Balance / 1_000_000;

        setPoolBalance(balance);
      } catch (error) {
        console.log(error);
      }
    };
    getPoolBalance();
  }, []);

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

        await Promise.all(
          nfts.map(async (nft) => {
            const cid = convertHexToString(nft.URI);
            try {
              const metadata = (await axios.get(`https://ipfs.io/ipfs/${cid}`))
                .data;
              console.log(metadata);

              setInReceivables((current) => [...current, metadata]);
            } catch (error) {
              console.log(error);
            }
          })
        );
      } catch (error) {
        console.log(error);
      }
    };

    if (wallet) {
      getReceivables();
    }
  }, [wallet]);

  return (
    <div className="business-container">
      <div className="header">Dashboard</div>

      {hasWallet && wallet && !keyPopupOpen ? (
        <div className="dashboard">
          <div className="left">
            <div className="header">Receivables</div>

            <div className="receivable-container">
              <div className="out">
                <div className="header">Out</div>

                <div className="receivables-box">
                  <div className="receivables-wrapper">
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                    <Receivable
                      type="out"
                      name="Texaco Towers"
                      date="12/23/22"
                      amount="$36,000"
                    />
                  </div>
                </div>
              </div>

              <div className="horizontal-line"></div>

              <div className="in">
                <div className="header">In</div>

                <div className="receivables-box">
                  <div className="receivables-wrapper">
                    {inReceivables.map((nft) => {
                      return (
                        <Receivable
                          type="in"
                          name={nft.debtor}
                          date={new Date(nft.due * 1000).toLocaleDateString()}
                          amount={nft.amount}
                          key={Math.random()}
                        />
                      );
                    })}
                    {/* <Receivable
                      type="in"
                      name="Microsoft"
                      date="01/03/23"
                      amount="$1,085.32"
                    />
                    <Receivable
                      type="in"
                      name="Microsoft"
                      date="01/03/23"
                      amount="$1,085.32"
                    />
                    <Receivable
                      type="in"
                      name="Microsoft"
                      date="01/03/23"
                      amount="$1,085.32"
                    />
                    <Receivable
                      type="in"
                      name="Microsoft"
                      date="01/03/23"
                      amount="$1,085.32"
                    />
                    <Receivable
                      type="in"
                      name="Microsoft"
                      date="01/03/23"
                      amount="$1,085.32"
                    /> */}
                  </div>
                </div>
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
                  +$56,232.10
                </div>
              </div>
              <div className="entry">
                <div className="sub-header">Amount due</div>
                <div className="info" style={{ color: "#f24b4b" }}>
                  -$25,128.00
                </div>
              </div>
              <div className="entry">
                <div className="sub-header">Net</div>
                <div className="info" style={{ color: "#22cd2a" }}>
                  $41,104
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
            {hasWallet && !wallet ? (
              <>
                <div className="action-header">
                  Enter your mnemonic to enter the platform. It will NOT leave
                  this personal device.
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
