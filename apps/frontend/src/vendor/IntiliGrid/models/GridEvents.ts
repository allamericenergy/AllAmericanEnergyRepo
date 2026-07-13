export interface GridEvents<T> {

  onRowClick?: (row: T) => void;

  onRowDoubleClick?: (row: T) => void;

  onCellClick?: (
    row: T,
    field: keyof T
  ) => void;

}