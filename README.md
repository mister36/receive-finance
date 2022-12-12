# Receive Finance

## What Receive Finance does

Receive Finance is a platform targeted for three types of users: businesses that issue and accept accounts receivables, and investors. Businesses can obtain A/Rs directly from their customers and sell them instantly through Receive’s pool of funds for **98% of its face value**. Customers are automatically billed after a specific payment date.

One of the most disruptive characteristics of Receive Finance is that it turns A/R into an investment for private investors. Traditionally, only certain institutions are able to profit from lending to A/R holders. With Receive, any investor can deposit into Receive’s liquidity pool, and on every A/R sale, receive a fraction of the 2% fee. Instead of earning yield from faulty tokenomics, users of DeFi can now generate returns from real-world activities.

## Technical Insights

- Receive Finance consists of interactions between the React frontend, the Node.JS backend, and the XRP ledger.
- Accounts receivables and investor entitlements are tokenized using NFTokens
- Accounts receivables metadata is stored on IPFS
- Funds are automatically pulled from debtors using Checks and a cron job
- Payments and A/R sales to the Receivable Pool are tracked and handled in realtime using WebSockets
- Business Information and other details that can’t be stored in a decentralized fashion are kept on a MongoDB server
- Private keys / seeds / mnemonics NEVER leave the frontend

## Contact

Adam Achebe — [@AdamIAchebe](https://twitter.com/AdamIAchebe) - achebe@stanford.edu
