import {
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent,
} from './tooltip';
import { Button } from '../Button/Button';

export default {
  title: 'shadcn/Tooltip',
  tags: ['autodocs'],
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
