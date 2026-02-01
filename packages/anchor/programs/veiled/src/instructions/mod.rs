// * Instruction modules
// * Re-export everything from each module so Anchor's #[program] macro can find Accounts structs
pub mod grant_permissions;
pub mod log_permission_access;
pub mod revoke_permissions;

// * Re-export Accounts structs and handlers from each module
pub use grant_permissions::*;
pub use log_permission_access::*;
pub use revoke_permissions::*;
