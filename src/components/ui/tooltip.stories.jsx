import {
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent,
} from './tooltip';
import { Button } from '../Button/Button';

export default {
  title: 'shadcn/Tooltip',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'shadcn/ui compound `Tooltip` (Radix-backed) — hover-triggered floating label. Wrap the app in `TooltipProvider` once at the root, then compose `Tooltip` → `TooltipTrigger` (`asChild` to render your own element) → `TooltipContent`.',
      },
    },
  },
};

export const Playground = {
  render: () => (
    <TooltipProvider>
      <Tooltip defaultOpen>
        <TooltipTrigger asChild><Button variant="secondary">Hover me</Button></TooltipTrigger>
        <TooltipContent>Deletes the record permanently.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
