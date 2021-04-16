import { nextTick, ComputedRef, WritableComputedRef, Ref } from 'vue'
import { Target } from '@/lib/suggestion'
import { Word } from './wordSuggester'

const useWordCompleter = (
  textareaRef: ComputedRef<HTMLTextAreaElement | undefined>,
  target: Ref<Target>,
  value: WritableComputedRef<string>,
  suggestedCandidates: Ref<Word[]>,
  selectedCandidateIndex: Ref<number>,
  confirmedPart: Ref<string>,
  /**
   * 補完候補を確定させたとき
   * 例えば、クリックしたのでこれ以上補完候補を表示しないようにするときなどに利用
   */
  onCompleteDetermined: () => void
) => {
  const commitCompletion = async (word: string) => {
    value.value =
      value.value.slice(0, target.value.begin) +
      word +
      value.value.slice(target.value.end)
    await nextTick()
    textareaRef.value?.setSelectionRange(
      target.value.begin + word.length,
      target.value.begin + word.length
    )
  }
  const onKeyDown = async (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || e.isComposing) return
    if (!textareaRef.value) return
    if (suggestedCandidates.value.length === 0) return
    e.preventDefault()
    if (suggestedCandidates.value.length === 1) {
      commitCompletion(suggestedCandidates.value[0].text)
      target.value.end = target.value.begin + suggestedCandidates.value.length
      onCompleteDetermined()
      return
    }
    if (selectedCandidateIndex.value === -1) {
      commitCompletion(confirmedPart.value)
      target.value.end = target.value.begin + confirmedPart.value.length
      if (confirmedPart.value === suggestedCandidates.value[0].text) {
        selectedCandidateIndex.value++
      }
    } else {
      commitCompletion(
        suggestedCandidates.value[selectedCandidateIndex.value].text
      )
      target.value.end =
        target.value.begin +
        suggestedCandidates.value[selectedCandidateIndex.value].text.length
    }
    if (selectedCandidateIndex.value === suggestedCandidates.value.length - 1) {
      selectedCandidateIndex.value = 0
      return
    }
    selectedCandidateIndex.value++
  }
  const onSelect = async (index: number) => {
    if (index === -1) {
      commitCompletion(confirmedPart.value)
    } else {
      commitCompletion(suggestedCandidates.value[index].text)
    }
    onCompleteDetermined()
  }
  return { onKeyDown, onSelect }
}

export default useWordCompleter
