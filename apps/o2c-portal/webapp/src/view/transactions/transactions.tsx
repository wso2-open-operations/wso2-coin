// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import {
  Clear as ClearIcon,
  ContentCopy as ContentCopyIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";

import { useEffect, useState } from "react";

import { State, Transaction } from "@/types/types";
import NoSearchResults from "@assets/images/no-search-results.svg";
import StateWithImage from "@component/ui/StateWithImage";
import {
  fetchWalletEmails,
  searchTransactions,
  setLimit,
  setOffset,
} from "@slices/transactionSlice/transaction";
import { RootState, useAppDispatch, useAppSelector } from "@slices/store";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

function truncateAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function CopyableCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard not available */ }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
      <Tooltip title={value} arrow enterDelay={300}>
        <Typography
          variant="body2"
          sx={{ fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {truncateAddress(value)}
        </Typography>
      </Tooltip>
      <Tooltip title={copied ? "Copied!" : "Copy"} arrow>
        <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
          <ContentCopyIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function AddressCell({ tx, field }: { tx: Transaction; field: "sender" | "receiver" }) {
  const address = field === "sender" ? tx.senderAddress : tx.receiverAddress;
  const email = field === "sender" ? tx.senderEmail : tx.receiverEmail;
  const isDefault = field === "sender" ? tx.senderDefaultWallet : tx.receiverDefaultWallet;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.25, py: 0.5 }}>
      <CopyableCell value={address} />
      {email && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {email}
          </Typography>
          {isDefault && (
            <Chip label="Default" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
          )}
        </Box>
      )}
    </Box>
  );
}

export default function TransactionBrowser() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const { transactions, state, hasMore, limit, offset, emails } = useAppSelector(
    (root: RootState) => root.transaction,
  );

  // Local filter state
  const [senderAddress, setSenderAddress] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [senderEmail, setSenderEmail] = useState<string | null>(null);
  const [senderEmailInput, setSenderEmailInput] = useState("");
  const [receiverEmail, setReceiverEmail] = useState<string | null>(null);
  const [receiverEmailInput, setReceiverEmailInput] = useState("");
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-load on mount
  useEffect(() => {
    dispatch(searchTransactions({ limit, offset: 0 }));
    dispatch(fetchWalletEmails());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const buildSearchRequest = (overrideOffset?: number) => ({
    ...(senderAddress && { senderAddress }),
    ...(receiverAddress && { receiverAddress }),
    ...(senderEmail && { senderEmail }),
    ...(receiverEmail && { receiverEmail }),
    ...(transactionHash && { transactionHash }),
    ...(startTime && { startTime: startTime.startOf("day").toISOString() }),
    ...(endTime && { endTime: endTime.endOf("day").toISOString() }),
    limit,
    offset: overrideOffset ?? offset,
  });

  const validate = (): boolean => {
    const ethAddressRegex = /^0x[0-9a-fA-F]{40}$/;
    const txHashRegex = /^0x[0-9a-fA-F]{64}$/;
    const newErrors: Record<string, string> = {};

    if (senderAddress && !ethAddressRegex.test(senderAddress)) {
      newErrors.senderAddress = "Please enter a valid Ethereum address (0x followed by 40 hex characters)";
    }
    if (receiverAddress && !ethAddressRegex.test(receiverAddress)) {
      newErrors.receiverAddress = "Please enter a valid Ethereum address (0x followed by 40 hex characters)";
    }
    if (transactionHash && !txHashRegex.test(transactionHash)) {
      newErrors.transactionHash = "Please enter a valid transaction hash (0x followed by 64 hex characters)";
    }
    if (startTime && endTime && startTime.isAfter(endTime)) {
      newErrors.startTime = "Start date must be before end date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = () => {
    if (!validate()) return;
    dispatch(setOffset(0));
    dispatch(searchTransactions(buildSearchRequest(0)));
  };

  const handleClear = () => {
    setErrors({});
    setSenderAddress("");
    setReceiverAddress("");
    setTransactionHash("");
    setSenderEmail(null);
    setSenderEmailInput("");
    setReceiverEmail(null);
    setReceiverEmailInput("");
    setStartTime(null);
    setEndTime(null);
    dispatch(setOffset(0));
    dispatch(searchTransactions({ limit, offset: 0 }));
  };

  const handlePrevious = () => {
    const newOffset = Math.max(0, offset - limit);
    dispatch(setOffset(newOffset));
    dispatch(searchTransactions(buildSearchRequest(newOffset)));
  };

  const handleNext = () => {
    const newOffset = offset + limit;
    dispatch(setOffset(newOffset));
    dispatch(searchTransactions(buildSearchRequest(newOffset)));
  };

  const handlePageSizeChange = (newSize: number) => {
    dispatch(setLimit(newSize));
    dispatch(setOffset(0));
    dispatch(
      searchTransactions({
        ...buildSearchRequest(0),
        limit: newSize,
      }),
    );
  };

  const currentPage = Math.floor(offset / limit) + 1;

  const columns: GridColDef[] = [
    {
      field: "blockNumber",
      headerName: "Block #",
      flex: 0.6,
      minWidth: 100,
      renderCell: (params) => {
        const tx = params.row as Transaction;
        return <Typography variant="body2">{tx.blockNumber.toLocaleString()}</Typography>;
      },
    },
    {
      field: "txHash",
      headerName: "Transaction Hash",
      flex: 1.3,
      minWidth: 180,
      renderCell: (params) => <CopyableCell value={(params.row as Transaction).txHash} />,
    },
    {
      field: "senderAddress",
      headerName: "From",
      flex: 1.4,
      minWidth: 200,
      renderCell: (params) => <AddressCell tx={params.row as Transaction} field="sender" />,
    },
    {
      field: "receiverAddress",
      headerName: "To",
      flex: 1.4,
      minWidth: 200,
      renderCell: (params) => <AddressCell tx={params.row as Transaction} field="receiver" />,
    },
    {
      field: "timestamp",
      headerName: "Time",
      flex: 1,
      minWidth: 150,
      valueGetter: (_value: unknown, row: Transaction) => row?.timestamp || "",
      renderCell: (params) => {
        const tx = params.row as Transaction;
        return (
          <Typography variant="body2">
            {dayjs(tx.timestamp).format("MMM DD, YYYY HH:mm")}
          </Typography>
        );
      },
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 2 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ color: theme.palette.customText.primary.p1.active }}
        >
          Transaction Browser
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }} onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}>
        <CardContent>
          <Grid container spacing={2}>
            {/* Row 1: Email filters */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Autocomplete
                options={emails}
                value={senderEmail}
                onChange={(_, value) => setSenderEmail(value)}
                inputValue={senderEmailInput}
                onInputChange={(_, value) => setSenderEmailInput(value)}
                renderInput={(params) => (
                  <TextField {...params} label="From Email" size="small" fullWidth />
                )}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Autocomplete
                options={emails}
                value={receiverEmail}
                onChange={(_, value) => setReceiverEmail(value)}
                inputValue={receiverEmailInput}
                onInputChange={(_, value) => setReceiverEmailInput(value)}
                renderInput={(params) => (
                  <TextField {...params} label="To Email" size="small" fullWidth />
                )}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }} />
            {/* Row 2: Address & hash filters */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="From Address"
                placeholder="0x..."
                value={senderAddress}
                onChange={(e) => { setSenderAddress(e.target.value); setErrors((prev) => ({ ...prev, senderAddress: "" })); }}
                size="small"
                error={!!errors.senderAddress}
                helperText={errors.senderAddress}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="To Address"
                placeholder="0x..."
                value={receiverAddress}
                onChange={(e) => { setReceiverAddress(e.target.value); setErrors((prev) => ({ ...prev, receiverAddress: "" })); }}
                size="small"
                error={!!errors.receiverAddress}
                helperText={errors.receiverAddress}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="Transaction Hash"
                placeholder="0x..."
                value={transactionHash}
                onChange={(e) => { setTransactionHash(e.target.value); setErrors((prev) => ({ ...prev, transactionHash: "" })); }}
                size="small"
                error={!!errors.transactionHash}
                helperText={errors.transactionHash}
              />
            </Grid>
            {/* Row 3: Date filters + buttons (right-aligned) */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DatePicker
                label="Start Date"
                value={startTime}
                onChange={(value) => setStartTime(value)}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DatePicker
                label="End Date"
                value={endTime}
                onChange={(value) => setEndTime(value)}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ height: "100%" }}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                  disabled={state === State.loading}
                >
                  Search
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClear}
                  disabled={state === State.loading}
                >
                  Clear
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Results */}
      {transactions.length === 0 && state !== State.loading ? (
        <Card>
          <CardContent sx={{ py: 6 }}>
            <StateWithImage
              message="No transactions found. Try adjusting your filters."
              imageUrl={NoSearchResults}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Box sx={{ width: "100%" }}>
            {state === State.loading ? (
              <Box>
                {/* Skeleton header */}
                <Box sx={{ display: "flex", gap: 2, px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                  {columns.map((col) => (
                    <Skeleton key={col.field} variant="text" height={24} sx={{ flex: col.flex ?? 1 }} />
                  ))}
                </Box>
                {/* Skeleton rows matching current row count */}
                {Array.from({ length: Math.min(transactions.length || limit, limit) }).map((_, i) => (
                  <Box key={i} sx={{ display: "flex", gap: 2, px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                    {columns.map((col) => (
                      <Skeleton key={col.field} variant="text" height={24} sx={{ flex: col.flex ?? 1 }} />
                    ))}
                  </Box>
                ))}
              </Box>
            ) : (
              <DataGrid
                rows={transactions}
                columns={columns}
                getRowId={(row) => row.txHash}
                getRowHeight={() => "auto"}
                autoHeight
                hideFooter
                disableColumnFilter
                disableRowSelectionOnClick
                sx={{
                  border: 0,
                  "& .MuiDataGrid-cell": {
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    py: 1,
                  },
                }}
              />
            )}
          </Box>

          {/* Pagination */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 2,
              mb: 3,
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <TextField
              select
              label="Rows per page"
              value={limit}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              size="small"
              sx={{ minWidth: 130 }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                startIcon={<NavigateBeforeIcon />}
                onClick={handlePrevious}
                disabled={offset === 0 || state === State.loading}
              >
                Previous
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                Page {currentPage}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                endIcon={<NavigateNextIcon />}
                onClick={handleNext}
                disabled={!hasMore || state === State.loading}
              >
                Next
              </Button>
            </Stack>
          </Box>
        </>
      )}
    </Container>
  );
}
