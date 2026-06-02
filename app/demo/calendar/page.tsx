import DemoCalendarClient from './calendar-client';
import { MOCK_BLOCKS } from '@/lib/mock-data';

export default function DemoCalendarPage() {
  return <DemoCalendarClient blocks={MOCK_BLOCKS} />;
}
