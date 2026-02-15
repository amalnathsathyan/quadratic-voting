import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { QuadraticVoting } from "../target/types/QuadraticVoting";
import { Keypair, PublicKey } from "@solana/web3.js"
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import assert from "assert"

describe("quadratic-voting", () => {

  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.quadraticVoting as Program<QuadraticVoting>;
  const creator = provider.wallet.payer
  const connection = provider.connection

  const voter = Keypair.generate()

  let daoPda: PublicKey
  let proposalPda: PublicKey
  let mint: PublicKey
  let voterTokenAccount: any

  before("Setup accounts", async () => {
    const sig = await connection.requestAirdrop(voter.publicKey, 8_000_000_000)
    await connection.confirmTransaction(sig);

    // Derive DAO PDA
    [daoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), creator.publicKey.toBuffer(), Buffer.from(daoName)],
      program.programId,
    )

    // Derive Proposal PDA 
    const proposalCount = new anchor.BN(0);
    
    [proposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    )

    // Create a mint and mint tokens to voter 
    mint = await createMint(connection, creator, creator.publicKey, null, 6)

    voterTokenAccount = await getOrCreateAssociatedTokenAccount(connection, voter, mint, voter.publicKey)

    // Mint tokens to voter
    await mintTo(
      connection,
      creator,
      mint,
      voterTokenAccount.address,
      creator,
      100_000_000, 
    )
  })

  it("Init DAO", async () => {
    const daoName = "DAO101"
    const tx = await program.methods
      .initDao(daoName)
      .accounts({
        creator: creator.publicKey,
      })
      .rpc()

    console.log("Init DAO success:", tx)

    const daoAccount = await program.account.dao.fetch(daoPda)
    assert.equal(daoAccount.name, daoName)
    assert.equal(daoAccount.authority.toBase58(), creator.publicKey.toBase58())
    assert.equal(daoAccount.proposalCount.toNumber(), 0)
    console.log("DAO account:", daoAccount)
  })

  it("Init Proposal", async () => {
    const tx = await program.methods
      .initProposal("This is a test proposal")
      .accounts({
        creator: creator.publicKey,
        daoAccount: daoPda,
      })
      .rpc()

    console.log("Init Proposal tx:", tx)

    const proposalAccount = await program.account.proposal.fetch(proposalPda)
    assert.equal(proposalAccount.metadata, "This is a test proposal")
    assert.equal(proposalAccount.authority.toBase58(), creator.publicKey.toBase58())
    assert.equal(proposalAccount.yesVoteCount.toNumber(), 0)
    assert.equal(proposalAccount.noVoteCount.toNumber(), 0)
    console.log("Proposal account:", proposalAccount)
  })

  it("Cast Vote", async () => {
    const [votePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), voter.publicKey.toBuffer(), proposalPda.toBuffer()],
      program.programId,
    )

    const tx = await program.methods
      .castVote(1) // 1 for yes 
      .accounts({
        voter: voter.publicKey,
        daoAccount: daoPda,
        proposal: proposalPda,
        creatorTokenAccount: voterTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([voter])
      .rpc()

    console.log("Cast Vote tx:", tx)

    const voteAccount = await program.account.vote.fetch(votePda)
    assert.equal(voteAccount.authority.toBase58(), voter.publicKey.toBase58())
    assert.equal(voteAccount.voteType, 1)
    console.log("Vote account:", voteAccount)
  })
})
