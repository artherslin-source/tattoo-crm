declare module 'react-big-calendar' {
  // Minimal typing shim for build-time; we intentionally keep this permissive.
  // If we later add @types/react-big-calendar, we can delete this file.
  export const Calendar: unknown;
  export function momentLocalizer(moment: unknown): unknown;
}

declare module 'react-big-calendar/lib/addons/dragAndDrop' {
  const withDragAndDrop: (calendar: unknown) => unknown;
  export default withDragAndDrop;
}


