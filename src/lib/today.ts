/**
 * The sample data's "today". Every module that filters or labels by date
 * measures from here rather than the wall clock, so the fixtures don't rot.
 */
export const TODAY = '2026-07-24'

/**
 * The sample clock's time of day, 24-hour. A schedule needs one: without it
 * every visit today reads the same, and "in progress" cannot be distinguished
 * from "finished at eight this morning".
 */
export const NOW = '12:00'
