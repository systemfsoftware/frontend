import { Atom } from '@systemfsoftware/effect-atom'
import { AtomReact } from '@systemfsoftware/effect-atom-react'
import { Gherkin, Given, it, makeFeature, Then, When } from '@systemfsoftware/effect-gherkin-spec'
import { vi } from '@systemfsoftware/vitest'
import { render } from '@testing-library/react'
import '@vitest/browser/matchers'
import * as Cause from 'effect/Cause'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { createElement } from 'react'
import { ownRegistry, renderCleanupLayer } from './__fixtures__/render-cleanup.js'

const Feature = makeFeature({ it })

interface Gateway {
  readonly build: number
}

class GatewayService extends Context.Service<GatewayService, Gateway>()(
  '@systemfsoftware/effect-atom-react/tests/multiple-roots-sharing-a-runtime.integration.test/GatewayService',
) {}

const makeGatewayLayer = () => {
  const counts = { built: 0, released: 0 }
  const layer = Layer.effect(
    GatewayService,
    Effect.acquireRelease(
      Effect.sync((): Gateway => ({ build: ++counts.built })),
      () => Effect.sync(() => void counts.released++),
    ),
  )
  return { counts, layer }
}

const mountRoot = (
  registry: Atom.Registry.Registry,
  gateway: Atom.Atom<Atom.AsyncResult.Result<Gateway | Context.Context<GatewayService>, Cause.NoSuchElementError>>,
) => {
  const seen: Gateway[] = []
  function Island() {
    const result = AtomReact.useAtomValue(gateway)
    if (!Atom.AsyncResult.isSuccess(result)) {
      return createElement('div', { 'data-testid': 'gateway-loading' })
    }
    if (!Context.isContext(result.value)) {
      seen.push(result.value)
    }
    return createElement('div', { 'data-testid': 'gateway-ready' })
  }
  const view = render(
    createElement(AtomReact.RegistryProvider, { registry }, createElement(Island)),
    { container: document.body.appendChild(document.createElement('div')) },
  )
  return { seen, view }
}

const registryWorkSettled = Effect.callback<void>((resume) => {
  const cancel = AtomReact.scheduleTask(() => resume(Effect.void))
  return Effect.sync(cancel)
})

Feature('Several roots on one page sharing one registry and one built layer')
  .live('renders real React roots in Chromium')
  .withLayer(Layer.empty)
  .withScenarioLayer(renderCleanupLayer)
  .body(({ scenario }) => {
    scenario(
      'A second root mounted after the first one unmounted reuses the layer the first root built',
      Gherkin.Do.pipe(
        Given('a page registry shared by every root and a service atom kept alive')('ctx', () =>
          Effect.sync(() => {
            const { counts, layer } = makeGatewayLayer()
            const runtime = Atom.context()(layer)
            const gateway = Atom.keepAlive(
              runtime.atom((_get) => GatewayService.use((service) => Effect.succeed(service))),
            )
            return { counts, gateway, registry: ownRegistry() }
          })),
        When('root A reads the service and unmounts, and then root B mounts on the same registry')(
          'roots',
          (s) =>
            Effect.gen(function*() {
              const a = mountRoot(s.ctx.registry, s.ctx.gateway)
              yield* Effect.promise(() => vi.waitFor(() => expectReady(a.seen)))
              a.view.unmount()
              yield* registryWorkSettled
              const b = mountRoot(s.ctx.registry, s.ctx.gateway)
              yield* Effect.promise(() => vi.waitFor(() => expectReady(b.seen)))
              return { a: a.seen, b: b.seen }
            }),
        ),
        Then('both roots hold the identical service and the layer was built exactly once')((s, expect) =>
          expect({
            built: s.ctx.counts.built,
            released: s.ctx.counts.released,
            sameInstance: s.roots.a.at(-1) === s.roots.b.at(-1),
            instance: s.roots.b.at(-1)?.build,
          }).toEqual({ built: 1, released: 0, sameInstance: true, instance: 1 })
        ),
      ),
    )

    scenario(
      'A fresh registry per test case builds and releases its own layer',
      Gherkin.Do.pipe(
        Given('the same kept-alive service atom and a layer that counts its builds and releases')(
          'ctx',
          () =>
            Effect.sync(() => {
              const { counts, layer } = makeGatewayLayer()
              const runtime = Atom.context()(layer)
              const gateway = Atom.keepAlive(
                runtime.atom((_get) => GatewayService.use((service) => Effect.succeed(service))),
              )
              return { counts, gateway }
            }),
        ),
        When('two cases each mint a registry, read the service and dispose the registry')(
          'cases',
          (s) =>
            Effect.gen(function*() {
              const instances: Gateway[] = []
              for (const _case of [1, 2]) {
                const registry = Atom.Registry.make({ scheduleTask: AtomReact.scheduleTask })
                const mounted = mountRoot(registry, s.ctx.gateway)
                yield* Effect.promise(() => vi.waitFor(() => expectReady(mounted.seen)))
                const latest = mounted.seen.at(-1)
                if (latest !== undefined) {
                  instances.push(latest)
                }
                mounted.view.unmount()
                Atom.Registry.dispose(registry)
              }
              yield* Effect.promise(() => vi.waitFor(() => expectReleased(s.ctx.counts)))
              return { instances }
            }),
        ),
        Then('each case built its own layer and released it on dispose')((s, expect) =>
          expect({
            counts: s.ctx.counts,
            builds: s.cases.instances.map((gateway) => gateway.build),
          }).toEqual({ counts: { built: 2, released: 2 }, builds: [1, 2] })
        ),
      ),
    )
  })

const expectReady = (seen: ReadonlyArray<Gateway>) => {
  if (seen.length === 0) {
    throw new Error('the root has not received the service yet')
  }
}

const expectReleased = (counts: { built: number; released: number }) => {
  if (counts.released < counts.built) {
    throw new Error('a layer is still held')
  }
}
