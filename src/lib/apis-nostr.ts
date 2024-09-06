import { hexToBytes } from '@noble/hashes/utils'
import {
  UserAccountState,
  type Apis,
  type Channel,
  type ChannelList,
  type Message,
  type Pin,
  type UserDetail
} from '@traptitech/traq'
import { AxiosHeaders } from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import { kinds, nip19, SimplePool } from 'nostr-tools'
import type { Event, Filter } from 'nostr-tools'
import type { ChannelMetadata } from 'nostr-tools/nip28'
import type { RelayRecord } from 'nostr-tools/relay'

export const overrideApisToNostr = async (apis: Apis): Promise<Apis> => {
  let relays: RelayRecord | undefined = undefined

  const getRelays = async (): Promise<RelayRecord> => {
    if (relays === undefined) {
      const newRelays = await window.nostr?.getRelays()
      if (newRelays === undefined) throw new Error('undefined relays')

      relays = newRelays
    }

    return relays
  }

  apis.getMessages = async (
    channelId: string,
    limit?: number,
    offset?: number,
    since?: string,
    until?: string,
    inclusive?: boolean,
    order?: 'asc' | 'desc',
    options?: AxiosRequestConfig
  ): Promise<AxiosResponse<Message[], unknown>> => {
    const pool = new SimplePool()
    const relayURLs = Object.keys(await getRelays())
    const events = await querySync(pool, relayURLs, [
      {
        kinds: [
          kinds.ChannelMessage,
          kinds.ChannelHideMessage,
          kinds.ChannelMuteUser
        ],
        limit,
        since: since ? isoToUnixtime(since) : undefined,
        until: until ? isoToUnixtime(until) : undefined,
        '#e': [channelId]
      }
    ])

    const messages = events.reduce<Message[]>((messages, e) => {
      switch (e.kind) {
        case kinds.ChannelMessage: {
          // TODO: support reply
          // https://github.com/nostr-protocol/nips/blob/master/28.md#:~:text=Reply%20to%20another%20message%3A
          const tag = e.tags.at(0)
          if (tag === undefined) throw new Error('tag not found')

          const [tagType, channelCreateEventId] = tag
          if (tagType !== 'e') throw `invalid tag type: ${tagType}`
          if (channelCreateEventId !== channelId) throw 'invalid channelId'

          messages.push({
            id: e.id,
            userId: e.pubkey,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            channelId: channelCreateEventId!,
            content: e.content,
            createdAt: unixtimeToISO(e.created_at),
            updatedAt: unixtimeToISO(e.created_at),
            pinned: false,
            stamps: [],
            threadId: null
          })

          break
        }

        case kinds.ChannelHideMessage: {
          break
        }

        case kinds.ChannelMuteUser: {
          break
        }
      }

      return messages
    }, [])

    return pseudoResponse(
      order === 'asc' ? messages : messages.reverse(),
      200,
      'OK'
    )
  }

  apis.getChannels = async (
    includeDm?: boolean,
    options?: AxiosRequestConfig
  ): Promise<AxiosResponse<ChannelList, unknown>> => {
    const pool = new SimplePool()
    const relayURLs = Object.keys(await getRelays())
    const events = await querySync(pool, relayURLs, [
      {
        kinds: [kinds.ChannelCreation]
      },
      {
        kinds: [kinds.ChannelMetadata]
      }
    ])

    const publicChannels = events.reduce<Channel[]>((channels, e) => {
      switch (e.kind) {
        case kinds.ChannelCreation: {
          const meta = JSON.parse(e.content) as ChannelMetadata
          channels.push({
            id: e.id,
            parentId: null,
            archived: false,
            force: false,
            topic: meta.about ?? '',
            name: meta.name ?? '',
            children: []
          })

          break
        }

        case kinds.ChannelMetadata: {
          const i = channels.findIndex(c => c.id === e.id)
          const channel = channels[i]
          if (i === -1 || !channel) {
            console.error('channel not found')
            return channels
          }

          const meta = JSON.parse(e.content) as ChannelMetadata
          channel.topic = meta.about ?? ''
          channel.name = meta.name ?? ''

          channels[i] = channel
        }
      }

      return channels
    }, [])

    const channelList: ChannelList = {
      public: publicChannels,
      dm: []
    }

    return pseudoResponse(channelList, 200, 'OK')
  }

  apis.getChannel = async (
    channelId: string,
    options?: AxiosRequestConfig
  ): Promise<AxiosResponse<Channel, unknown>> => {
    const pool = new SimplePool()
    const relayURLs = Object.keys(await getRelays())
    const events = await querySync(pool, relayURLs, [
      {
        ids: [channelId],
        kinds: [kinds.ChannelCreation]
      },
      {
        kinds: [kinds.ChannelMetadata],
        '#e': [channelId]
      }
    ])

    let channel: Channel | undefined = undefined
    for (const e of events) {
      switch (e.kind) {
        case kinds.ChannelCreation: {
          if (e.id !== channelId) throw new Error('invalid channelId')

          const meta = JSON.parse(e.content) as ChannelMetadata
          channel = {
            id: e.id,
            parentId: null,
            archived: false,
            force: false,
            topic: meta.about ?? '',
            name: meta.name ?? '',
            children: []
          }

          break
        }

        case kinds.ChannelMetadata: {
          const tag = e.tags.at(0)
          if (tag === undefined) throw new Error('tag not found')

          const [tagType, channelCreateEventId, relayURL, marker] = tag
          if (tagType !== 'e') throw new Error('invalid tag type')
          if (channelCreateEventId !== channelId)
            throw new Error('invalid channelId')
          if (!relayURL || !relayURLs.includes(relayURL))
            throw new Error('invalid relay')
          if (marker !== 'root' && marker !== 'reply')
            throw new Error('invalid marker')

          const meta = JSON.parse(e.content) as ChannelMetadata
          if (channel === undefined) throw new Error('undefined channel')

          channel.topic = meta.about ?? ''
          channel.name = meta.name ?? ''

          break
        }
      }
    }

    if (channel === undefined) throw new Error('channel not found')

    return pseudoResponse(channel, 200, 'OK')
  }

  // TODO: https://github.com/nostr-protocol/nips/blob/master/51.md
  apis.getChannelPins = async (
    channelId: string,
    options?: AxiosRequestConfig
  ): Promise<AxiosResponse<Pin[], unknown>> => {
    return pseudoResponse([], 200, 'OK')
  }

  const usernameDecoder = new TextDecoder("utf-8")
  apis.getUser = async (
    userId: string, // pubkey
    options?: AxiosRequestConfig
  ): Promise<AxiosResponse<UserDetail, unknown>> => {
    const pool = new SimplePool()
    const relayURLs = Object.keys(await getRelays())
    const event = (
      await querySync(pool, relayURLs, [
        {
          kinds: [kinds.Metadata],
          authors: [userId]
        }
      ])
    ).at(0)
    if (event === undefined) {
      // @ts-expect-error 404
      return pseudoResponse({}, 404, 'user not found')
    }

    const content = JSON.parse(event.content) as {
      name: string
      about: string
      picture: string
    } // FIXME: not found on nostr-tools?
    const user: UserDetail = {
      id: userId,
      state: UserAccountState.active,
      bot: false,
      iconFileId: content.picture,
      displayName: content.name,
      name: nip19.npubEncode(userId).substring(0, 10),
      twitterId: '',
      lastOnline: null,
      updatedAt: unixtimeToISO(event.created_at),
      tags: [],
      groups: [],
      bio: content.about,
      homeChannel: null
    }

    return pseudoResponse(user, 200, 'OK')
  }

  return apis
}

const isoToUnixtime = (iso: string): number => new Date(iso).getTime() / 1000
const unixtimeToISO = (unixtime: number): string =>
  new Date(unixtime * 1000).toISOString()

const pseudoResponse = <T>(data: T, status: number, statusText: string) => {
  return {
    data,
    status,
    statusText,
    headers: {
      'x-traq-more': 'true' // メッセージの追加取得のためにとりあえず固定で置いている
    },
    config: {
      headers: new AxiosHeaders()
    }
  }
}

// pool.querySyncがfilterを1つしか取らないので暫定対処
const querySync = async (
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
