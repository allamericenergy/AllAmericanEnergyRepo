import {
    useMemo,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
} from "react";

import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

import type {
    GridCellParams,
    GridColumn,
    GridRowModel,
    GridSelectOption,
    GridSelectOptionValue,
} from "../models";
import { useGridRuntime } from "../runtime";

interface GridEditCellProps<T extends GridRowModel> {
    row: T;
    column: GridColumn<T>;
    value: unknown;
}

export default function GridEditCell<T extends GridRowModel>({
    row,
    column,
    value,
}: GridEditCellProps<T>) {
    const runtime = useGridRuntime<T>();

    const [draft, setDraft] = useState(String(value ?? ""));

    const inputRef = useRef<HTMLInputElement | null>(null);
    const selectRef = useRef<HTMLInputElement | null>(null);
    const finishedRef = useRef(false);

    const selectOptions = useMemo(
        () =>
            column.cellEditor === "select"
                ? resolveSelectOptions(
                      column.cellEditorParams?.values,
                      {
                          value,
                          row,
                          rowIndex: 0,
                      }
                  )
                : [],
        [
            column.cellEditor,
            column.cellEditorParams,
            value,
            row,
        ]
    );

    const selectedOptionIndex = Math.max(
        0,
        selectOptions.findIndex((option) =>
            areOptionValuesEqual(option.value, value)
        )
    );

    useEffect(() => {
        setTimeout(() => {
            if (column.cellEditor === "select") {
                selectRef.current?.focus();
                return;
            }

            inputRef.current?.focus();
            inputRef.current?.select();
        }, 0);
    }, [column.cellEditor]);

    function commit(nextValue: unknown = draft) {
        if (finishedRef.current) return;

        finishedRef.current = true;

        runtime.commitCellEdit(
            row.id,
            column.field,
            nextValue
        );
    }

    function cancel() {
        if (finishedRef.current) return;

        finishedRef.current = true;

        runtime.cancelCellEdit();
    }

    function handleKeyDown(
        event: KeyboardEvent<HTMLElement>
    ) {
        event.stopPropagation();

        if (event.key === "Enter") {
            event.preventDefault();
            commit();
        }

        if (event.key === "Escape") {
            event.preventDefault();
            cancel();
        }
    }

    if (column.cellEditor === "select") {
        return (
            <Select
                inputRef={selectRef}
                value={String(selectedOptionIndex)}
                onChange={(event) => {
                    const option =
                        selectOptions[
                            Number(event.target.value)
                        ];

                    if (option) {
                        commit(option.value);
                    }
                }}
                onBlur={() => {
                    if (!finishedRef.current) {
                        runtime.cancelCellEdit();
                    }
                }}
                onKeyDown={handleKeyDown}
                size="small"
                fullWidth
                sx={{
                    height: 28,
                    fontSize: 13,
                    "& .MuiSelect-select": {
                        py: 0.5,
                        px: 1,
                    },
                }}
            >
                {selectOptions.map((option, index) => (
                    <MenuItem
                        key={`${String(option.value)}-${index}`}
                        value={String(index)}
                    >
                        {option.label}
                    </MenuItem>
                ))}
            </Select>
        );
    }

    return (
        <TextField
            inputRef={inputRef}
            value={draft}
            onChange={(event) =>
                setDraft(event.target.value)
            }
            onBlur={commit}
            onKeyDown={handleKeyDown}
            size="small"
            variant="outlined"
            fullWidth
            sx={{
                "& .MuiInputBase-root": {
                    height: 28,
                    fontSize: 13,
                },
                "& input": {
                    px: 1,
                },
            }}
        />
    );
}

interface NormalizedSelectOption {
    value: GridSelectOptionValue;
    label: string;
}

function resolveSelectOptions<T extends GridRowModel>(
    values:
        | readonly GridSelectOption[]
        | ((
              params: GridCellParams<T>
          ) => readonly GridSelectOption[])
        | undefined,
    params: GridCellParams<T>
): NormalizedSelectOption[] {
    const resolvedValues =
        typeof values === "function"
            ? values(params)
            : values ?? [];

    return resolvedValues.map((option) => {
        if (
            option !== null &&
            typeof option === "object"
        ) {
            return {
                value: option.value,
                label: option.label,
            };
        }

        return {
            value: option,
            label: String(option ?? ""),
        };
    });
}

function areOptionValuesEqual(
    optionValue: GridSelectOptionValue,
    cellValue: unknown
) {
    return (
        Object.is(optionValue, cellValue) ||
        String(optionValue ?? "") === String(cellValue ?? "")
    );
}
