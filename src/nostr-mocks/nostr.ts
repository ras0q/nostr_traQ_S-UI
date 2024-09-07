import type { Event } from 'nostr-tools'
import type { Filter } from 'nostr-tools/filter'
import type { SimplePool } from 'nostr-tools/pool'
import type { RelayRecord } from 'nostr-tools/relay'

export default class Nostr {
  static #publicKey: string | undefined
  static async publicKey() {
    if (this.#publicKey === undefined) {
      const newPK = await window.nostr?.getPublicKey()
      if (newPK === undefined) throw 'undefined publicKey'
      this.#publicKey = newPK
    }
    return this.#publicKey
  }

  static #defaultRelays: RelayRecord = {
    'wss://relay.damus.io': { read: true, write: true },
    'wss://yabu.me': { read: true, write: true }
  }
  static additionalRelays: RelayRecord | undefined
  static async relays() {
    if (this.additionalRelays === undefined) {
      const newRelays = await window.nostr?.getRelays()
      if (newRelays === undefined) throw 'undefined relays'
      this.additionalRelays = newRelays
    }
    return {
      ...this.#defaultRelays,
      ...this.additionalRelays
    }
  }
}

export const isoToUnixtime = (iso: string): number =>
  new Date(iso).getTime() / 1000
export const unixtimeToISO = (unixtime: number): string =>
  new Date(unixtime * 1000).toISOString()

// pool.querySyncがfilterを1つしか取らないので暫定対処
export const querySync = async (
  pool: SimplePool,
  relayURLs: string[],
  filters: Filter[]
) =>
  await new Promise<Event[]>(resolve => {
    const events: Event[] = []
    const sub = pool.subscribeMany(relayURLs, filters, {
      onevent(e) {
        events.push(e)
      },
      oneose() {
        sub.close() // 追加のストリーミングを受け取らない
      },
      onclose() {
        resolve(events)
      }
    })
  })
