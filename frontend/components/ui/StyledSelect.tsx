// components/ui/StyledSelect.tsx
'use client'

import Select, { GroupBase, Props as SelectProps } from 'react-select'

export type Option = { value: string; label: string }

// Turn a plain string[] (like PROVINCES, UOMS, RATES) into react-select options
export const toOptions = (arr: string[]): Option[] =>
  arr.map(v => ({ value: v, label: v }))

interface StyledSelectProps<IsMulti extends boolean = false>
  extends SelectProps<Option, IsMulti, GroupBase<Option>> {}

export default function StyledSelect<IsMulti extends boolean = false>(
  props: StyledSelectProps<IsMulti>
) {
  return (
    <Select
      unstyled
      isClearable
      classNames={{
        control: (state) =>
          `w-full bg-surface border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors ${
            state.isFocused ? 'border-accent' : 'border-border'
          }`,
        placeholder: () => 'text-muted',
        singleValue: () => 'text-heading',
        input: () => 'text-heading',
        menu: () => 'bg-surface border border-border rounded-lg shadow-lg mt-1 z-20 overflow-hidden',
        menuList: () => 'py-1 max-h-60 overflow-y-auto',
        option: (state) =>
          `px-3 py-1.5 text-sm cursor-pointer ${
            state.isSelected
              ? 'bg-heading text-surface'
              : state.isFocused
              ? 'bg-border-light text-heading'
              : 'text-body'
          }`,
       indicatorSeparator: () => 'w-px bg-border my-1.5',
        dropdownIndicator: () => 'text-muted/70 px-2',
        clearIndicator: () => 'text-muted/70 hover:text-heading px-1 cursor-pointer transition-colors',
      }}
      {...props}
    />
  )
}