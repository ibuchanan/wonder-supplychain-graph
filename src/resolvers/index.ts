import Resolver from "@forge/resolver";

import { registerInvitationsResolvers } from "./invitations";
import { registerReadinessResolvers } from "./readiness";
import { registerNominationsResolvers } from "./nominations";
import { registerPeerCxResolvers } from "./peer-cx";
import { registerLogSinkResolvers } from "./log-sink";

const resolver = new Resolver();

// Register all domain-specific resolvers
registerInvitationsResolvers(resolver);
registerReadinessResolvers(resolver);
registerNominationsResolvers(resolver);
registerPeerCxResolvers(resolver);
registerLogSinkResolvers(resolver);

export const handler = resolver.getDefinitions();
