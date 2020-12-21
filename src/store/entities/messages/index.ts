import { defineModule } from 'direct-vuex'
import { state } from './state'
import { getters } from './getters'
import { mutations } from './mutations'
import { actions } from './actions'
import { listeners } from './listeners'
import { mitt } from '@/lib/typedMitt'
import { Message } from '@traptitech/traq'
import { MessageId } from '@/types/entity-ids'

export const messages = defineModule({
  namespaced: true,
  state,
  getters,
  mutations,
  actions
})
listeners()

type MessageEventMap = {
  reconnect: () => void
  addMessage: (message: Message) => void
  updateMessage: (message: Message) => void
  deleteMessage: (messageId: MessageId) => void
}

export const messageMitt = mitt<MessageEventMap>()
