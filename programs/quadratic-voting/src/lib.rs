use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod errors;

use instructions::{__client_accounts_cast_vote,__client_accounts_init_proposal, __client_accounts_init_dao};


declare_id!("6avDCS3jHNMSTERMuvAPXqo1xaqgbLvaReHPkpxhuowd");

#[program]
pub mod anchor_quadratic_voting_q1_26 {
    use super::*;

    pub fn init_dao(ctx: Context<InitDao>, name: String) -> Result<()> {
        ctx.accounts.init_dao(&ctx.bumps, name)
    }

    pub fn init_proposal(ctx: Context<InitProposalContext>, metadata: String) -> Result<()> {
        instructions::init_proposal(ctx, metadata)
    }
        pub fn cast_vote(ctx: Context<CastVote>, vote_type: u8) -> Result<()> {
        instructions::cast_vote(ctx, vote_type)
    }
}
