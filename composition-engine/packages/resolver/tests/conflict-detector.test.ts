import { test, expect } from 'vitest';
import { Feature } from '@minecode/core';
import { FeatureConflictDetector, FeatureConflictError } from '../src/index.js';

test('test_GivenNoConflicts_WhenDetectCalled_ThenShouldPass', () => {
  const detector = new FeatureConflictDetector();
  const features: Feature[] = [
    {
      id: 'auth-feature',
      version: '1.0.0',
      type: 'business',
      metadata: {
        name: 'Auth',
        description: 'User authentication',
        stack: ['nextjs-supabase'],
      },
      contract: {
        provides: {
          capabilities: ['auth'],
        },
      },
      dependencies: [],
      modules: [],
    },
    {
      id: 'billing-feature',
      version: '1.0.0',
      type: 'business',
      metadata: {
        name: 'Billing',
        description: 'Payments',
        stack: ['nextjs-supabase'],
      },
      contract: {
        provides: {
          capabilities: ['billing'],
        },
      },
      dependencies: [],
      modules: [],
    },
  ];

  expect(() => detector.detect(features, 'nextjs-supabase')).not.toThrow();
});

test('test_GivenDuplicateCapabilities_WhenDetectCalled_ThenShouldThrowConflictError', () => {
  const detector = new FeatureConflictDetector();
  const features: Feature[] = [
    {
      id: 'auth-jwt',
      version: '1.0.0',
      type: 'business',
      metadata: {
        name: 'JWT Auth',
        description: 'JWT-based auth',
      },
      contract: {
        provides: {
          capabilities: ['auth'],
        },
      },
      dependencies: [],
      modules: [],
    },
    {
      id: 'auth-oauth',
      version: '1.0.0',
      type: 'business',
      metadata: {
        name: 'OAuth Auth',
        description: 'OAuth-based auth',
      },
      contract: {
        provides: {
          capabilities: ['auth'],
        },
      },
      dependencies: [],
      modules: [],
    },
  ];

  expect(() => detector.detect(features, 'nextjs-supabase')).toThrow(FeatureConflictError);
  try {
    detector.detect(features, 'nextjs-supabase');
  } catch (err: unknown) {
    const error = err as FeatureConflictError;
    expect(error).toBeInstanceOf(FeatureConflictError);
    expect(error.conflicts).toContain(
      "Duplicate capability 'auth' provided by multiple features: auth-jwt, auth-oauth."
    );
  }
});

test('test_GivenExplicitFeatureConflict_WhenDetectCalled_ThenShouldThrowConflictError', () => {
  const detector = new FeatureConflictDetector();
  const features: Feature[] = [
    {
      id: 'auth-custom',
      version: '1.0.0',
      type: 'business',
      metadata: {
        name: 'Custom Auth',
        description: 'Custom authentication',
      },
      contract: {
        conflicts: {
          features: ['auth-clerk'],
        },
      },
      dependencies: [],
      modules: [],
    },
    {
      id: 'auth-clerk',
      version: '1.0.0',
      type: 'business',
      metadata: {
        name: 'Clerk Auth',
        description: 'Clerk-based auth',
      },
      contract: {},
      dependencies: [],
      modules: [],
    },
  ];

  expect(() => detector.detect(features, 'nextjs-supabase')).toThrow(FeatureConflictError);
  try {
    detector.detect(features, 'nextjs-supabase');
  } catch (err: unknown) {
    const error = err as FeatureConflictError;
    expect(error).toBeInstanceOf(FeatureConflictError);
    expect(error.conflicts).toContain(
      "Feature 'auth-custom' explicitly conflicts with feature 'auth-clerk'."
    );
  }
});

test('test_GivenExplicitCapabilityConflict_WhenDetectCalled_ThenShouldThrowConflictError', () => {
  const detector = new FeatureConflictDetector();
  const features: Feature[] = [
    {
      id: 'auth-custom',
      version: '1.0.0',
      type: 'business',
      metadata: {
        name: 'Custom Auth',
        description: 'Custom authentication',
      },
      contract: {
        conflicts: {
          capabilities: ['auth'],
        },
      },
      dependencies: [],
      modules: [],
    },
    {
      id: 'auth-clerk',
      version: '1.0.0',
      type: 'business',
      metadata: {
        name: 'Clerk Auth',
        description: 'Clerk-based auth',
      },
      contract: {
        provides: {
          capabilities: ['auth'],
        },
      },
      dependencies: [],
      modules: [],
    },
  ];

  expect(() => detector.detect(features, 'nextjs-supabase')).toThrow(FeatureConflictError);
  try {
    detector.detect(features, 'nextjs-supabase');
  } catch (err: unknown) {
    const error = err as FeatureConflictError;
    expect(error).toBeInstanceOf(FeatureConflictError);
    expect(error.conflicts).toContain(
      "Feature 'auth-custom' explicitly conflicts with capability 'auth' provided by: auth-clerk."
    );
  }
});

test('test_GivenSelfExplicitCapabilityConflict_WhenDetectCalled_ThenShouldPass', () => {
  const detector = new FeatureConflictDetector();
  const features: Feature[] = [
    {
      id: 'auth-all-in-one',
      version: '1.0.0',
      type: 'business',
      metadata: {
        name: 'All-In-One Auth',
        description: 'Authentication capability',
      },
      contract: {
        provides: {
          capabilities: ['auth'],
        },
        conflicts: {
          capabilities: ['auth'], // It conflicts with 'auth' provided by other features, but not itself
        },
      },
      dependencies: [],
      modules: [],
    },
  ];

  expect(() => detector.detect(features, 'nextjs-supabase')).not.toThrow();
});

test('test_GivenUnsupportedStackDirectOrTransitive_WhenDetectCalled_ThenShouldThrowConflictError', () => {
  const detector = new FeatureConflictDetector();
  const features: Feature[] = [
    {
      id: 'auth-nextjs',
      version: '1.0.0',
      type: 'business',
      metadata: {
        name: 'Next.js Auth',
        description: 'Next.js only',
        stack: ['nextjs-supabase'],
      },
      contract: {},
      dependencies: [],
      modules: [],
    },
  ];

  expect(() => detector.detect(features, 'django-postgres')).toThrow(FeatureConflictError);
  try {
    detector.detect(features, 'django-postgres');
  } catch (err: unknown) {
    const error = err as FeatureConflictError;
    expect(error).toBeInstanceOf(FeatureConflictError);
    expect(error.conflicts).toContain(
      "Feature 'auth-nextjs' is not compatible with selected stack 'django-postgres'. Supported stacks: nextjs-supabase."
    );
  }
});

test('test_GivenFeatureConflictError_WhenInstantiated_ThenFormatsCorrectActionableMessage', () => {
  const conflicts = ['Conflicting feature x', 'Unsupported stack y'];
  const error = new FeatureConflictError('Validation failed', conflicts);

  expect(error.name).toBe('FeatureConflictError');
  expect(error.conflicts).toEqual(conflicts);
  expect(error.message).toContain('Validation failed:');
  expect(error.message).toContain('  - Conflicting feature x');
  expect(error.message).toContain('  - Unsupported stack y');
});
