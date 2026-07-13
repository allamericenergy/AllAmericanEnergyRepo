/**
 * Base interface for all IntiliGrid row models.
 *
 * Every row must have a unique id.
 * Users can extend this interface with their own fields.
 */
export interface GridRowModel {
    id: string | number;
}