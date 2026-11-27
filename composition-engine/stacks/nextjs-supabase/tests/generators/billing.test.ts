import * as nodeCrypto from 'node:crypto';
import { createHmac } from 'node:crypto';
import ts from 'typescript';
import { describe, test, expect } from 'vitest';
import {
  STRIPE_SIGNATURE_LIB,
  SUPABASE_ADMIN_LIB,
  buildCheckoutRoute,
  buildWebhookRoute,
} from '../../src/generators/billing.js';

type Verify = (payload: string, header: string | null, secret: string, now?: number) => boolean;

function loadVerifier(): Verify {
  const js = ts.transpileModule(STRIPE_SIGNATURE_LIB, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} as { verifyStripeSignature: Verify } };
  new Function('module', 'exports', 'require', js)(module, module.exports, (id: string) =>
    id === 'node:crypto' ? nodeCrypto : undefined
  );
  return module.exports.verifyStripeSignature;
}

function sign(payload: string, secret: string, timestamp: number): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

describe('verifyStripeSignature (generated)', () => {
  const verify = loadVerifier();
  const now = 1_700_000_000;
  const payload = '{"type":"checkout.session.completed"}';

  test('test_VerifyStripeSignature_ValidSignature_ReturnsTrue', () => {
    expect(verify(payload, sign(payload, 'whsec_a', now), 'whsec_a', now)).toBe(true);
  });

  test('test_VerifyStripeSignature_WrongSecret_ReturnsFalse', () => {
    expect(verify(payload, sign(payload, 'whsec_b', now), 'whsec_a', now)).toBe(false);
  });

  test('test_VerifyStripeSignature_TamperedPayload_ReturnsFalse', () => {
    expect(verify(payload + ' ', sign(payload, 'whsec_a', now), 'whsec_a', now)).toBe(false);
  });

  test('test_VerifyStripeSignature_TimestampOlderThanTolerance_ReturnsFalse', () => {
    expect(verify(payload, sign(payload, 'whsec_a', now - 301), 'whsec_a', now)).toBe(false);
  });

  test('test_VerifyStripeSignature_TimestampWithinTolerance_ReturnsTrue', () => {
    expect(verify(payload, sign(payload, 'whsec_a', now - 299), 'whsec_a', now)).toBe(true);
  });

  test('test_VerifyStripeSignature_MissingHeader_ReturnsFalse', () => {
    expect(verify(payload, null, 'whsec_a', now)).toBe(false);
  });

  test('test_VerifyStripeSignature_MalformedHeader_ReturnsFalse', () => {
    expect(verify(payload, 'garbage', 'whsec_a', now)).toBe(false);
  });

  test('test_VerifyStripeSignature_HeaderWithoutV1_ReturnsFalse', () => {
    expect(verify(payload, `t=${now}`, 'whsec_a', now)).toBe(false);
  });

  test('test_VerifyStripeSignature_NonHexSignature_ReturnsFalse', () => {
    expect(verify(payload, `t=${now},v1=zzzz`, 'whsec_a', now)).toBe(false);
  });

  test('test_VerifyStripeSignature_MultipleV1WithOneValid_ReturnsTrue', () => {
    const valid = sign(payload, 'whsec_a', now);
    expect(verify(payload, `${valid},v1=deadbeef`, 'whsec_a', now)).toBe(true);
  });
});

describe('billing route templates', () => {
  test('test_BuildWebhookRoute_Generated_ImportsVerifierWithCorrectRelativePath', () => {
    const route = buildWebhookRoute('d', 'api/billing/webhook');
    expect(route).toContain("from '../../../../generated/lib/billing/verify-stripe-signature'");
  });

  test('test_BuildWebhookRoute_Generated_RejectsBeforeParsingBody', () => {
    const route = buildWebhookRoute('d', 'api/billing/webhook');
    expect(route.indexOf('verifyStripeSignature(rawBody')).toBeLessThan(
      route.indexOf('JSON.parse')
    );
  });

  test('test_BuildCheckoutRoute_Generated_ReturnsNotImplementedAndNoMockUrl', () => {
    const route = buildCheckoutRoute('d', 'api/billing/checkout');
    expect(route).toContain('status: 501');
    expect(route).not.toContain('session_mock');
  });
});

describe('webhook persistence', () => {
  const route = buildWebhookRoute('d', 'api/billing/webhook');

  test('test_BuildWebhookRoute_Generated_WritesWithAdminClientNotUserSession', () => {
    expect(route).toContain('createAdminClient()');
    expect(route).not.toContain('createRouteHandlerClient');
    expect(route).toContain("from '../../../../generated/lib/supabase/admin'");
  });

  test('test_BuildWebhookRoute_Generated_UpsertsOnStripeCustomerIdForRetries', () => {
    expect(route).toContain(".from('stripe_customer')");
    expect(route).toContain('.upsert(');
    expect(route).toContain("onConflict: 'stripe_customer_id'");
  });

  test('test_BuildWebhookRoute_Generated_UsesSnakeCaseColumns', () => {
    expect(route).toContain('organization_id: organizationId');
    expect(route).toContain('stripe_customer_id: session.customer');
  });

  test('test_BuildWebhookRoute_Generated_DatabaseFailureReturns500SoStripeRetries', () => {
    expect(route).toMatch(/status: 500/);
  });

  test('test_BuildWebhookRoute_Generated_InvalidJsonReturns400', () => {
    expect(route).toContain("error: 'Invalid JSON'");
  });

  test('test_BuildWebhookRoute_Generated_OtherEventTypesAreAcknowledged', () => {
    expect(route).toContain("payload.type !== 'checkout.session.completed'");
    expect(route).toContain('ignored: true');
  });

  test('test_SupabaseAdminLib_Generated_RequiresServiceRoleKeyAndDoesNotPersistSession', () => {
    expect(SUPABASE_ADMIN_LIB).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(SUPABASE_ADMIN_LIB).toContain('persistSession: false');
    expect(SUPABASE_ADMIN_LIB).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE');
  });
});
