import { UnsupportedContractError } from '../../errors.js';
import {
  STRIPE_SIGNATURE_LIB,
  STRIPE_SIGNATURE_LIB_PATH,
  SUPABASE_ADMIN_LIB,
  SUPABASE_ADMIN_LIB_PATH,
  buildCheckoutRoute,
  buildWebhookRoute,
} from '../../billing.js';
import { BehaviorBuilder } from '../types.js';
import {
  aiChatPost,
  authLogin,
  authLogout,
  authResetPassword,
  notificationsSend,
  organizationsCreate,
  organizationsInvite,
  rbacChangeMemberRole,
  searchQuery,
  storageDelete,
  storageUpload,
} from './builtin.js';

const plain =
  (build: (ctx: Parameters<BehaviorBuilder>[0]) => string): BehaviorBuilder =>
  (ctx) => ({ source: build(ctx) });

/**
 * Behaviors of the nextjs-supabase stack, keyed by the id used in feature contracts.
 * A behavior is implemented per stack; contracts only name it.
 */
export const BEHAVIORS: Record<string, BehaviorBuilder> = {
  'auth.login': plain(authLogin),
  'auth.logout': plain(authLogout),
  'auth.reset-password': plain(authResetPassword),
  'organizations.invite': plain(organizationsInvite),
  'organizations.create': plain(organizationsCreate),
  'rbac.change-member-role': plain(rbacChangeMemberRole),
  'storage.upload': plain(storageUpload),
  'storage.delete': plain(storageDelete),
  'notifications.send': plain(notificationsSend),
  'search.query': plain(searchQuery),
  'ai.chat.post': plain(aiChatPost),
  'billing.checkout': (ctx) => ({ source: buildCheckoutRoute(ctx.description, ctx.routePath) }),
  'billing.webhook': (ctx) => ({
    source: buildWebhookRoute(ctx.description, ctx.routePath),
    extraFiles: {
      [STRIPE_SIGNATURE_LIB_PATH]: STRIPE_SIGNATURE_LIB,
      [SUPABASE_ADMIN_LIB_PATH]: SUPABASE_ADMIN_LIB,
    },
  }),
};

/** Behaviors available to one generation run: the stack's own plus those contributed by feature packages. */
export class BehaviorRegistry {
  private readonly builders = new Map<string, BehaviorBuilder>(Object.entries(BEHAVIORS));

  public register(id: string, builder: BehaviorBuilder): void {
    if (typeof builder !== 'function') {
      throw new UnsupportedContractError(`Behavior '${id}' must be a function`);
    }
    if (this.builders.has(id)) {
      throw new UnsupportedContractError(
        `Behavior '${id}' is already implemented by stack 'nextjs-supabase'`
      );
    }
    this.builders.set(id, builder);
  }

  public ids(): string[] {
    return [...this.builders.keys()].sort();
  }

  public get(id: string, apiId: string): BehaviorBuilder {
    const builder = this.builders.get(id);
    if (!builder) {
      throw new UnsupportedContractError(
        `API '${apiId}' names behavior '${id}', which stack 'nextjs-supabase' does not implement`
      );
    }
    return builder;
  }
}

export function behaviorFor(id: string, apiId: string): BehaviorBuilder {
  return new BehaviorRegistry().get(id, apiId);
}
