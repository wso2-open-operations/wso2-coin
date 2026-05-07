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
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import dayjs from "dayjs";

import { useEffect, useMemo, useState } from "react";

import { State, UserWalletDetail } from "@/types/types";
import NoDataImage from "@assets/images/no-data.svg";
import NoSearchResults from "@assets/images/no-search-results.svg";
import StateWithImage from "@component/ui/StateWithImage";
import { fetchWalletBalances, fetchWallets } from "@slices/walletSlice/wallet";
import { RootState, useAppDispatch, useAppSelector } from "@slices/store";

function truncateAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function WalletAddressCell({ wallet }: { wallet: UserWalletDetail }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard not available */ }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
      <Tooltip title={wallet.walletAddress} arrow enterDelay={300}>
        <Typography
          variant="body2"
          sx={{ fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {truncateAddress(wallet.walletAddress)}
        </Typography>
      </Tooltip>
      <Tooltip title={copied ? "Copied!" : "Copy"} arrow>
        <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
          <ContentCopyIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
      {wallet.defaultWallet && (
        <Chip label="Default" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
      )}
    </Box>
  );
}

export default function Wallets() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const { wallets, state, balances } = useAppSelector((root: RootState) => root.wallet);
  const [searchQuery, setSearchQuery] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  useEffect(() => {
    dispatch(fetchWallets());
  }, [dispatch]);

  const filteredWallets = useMemo(() => {
    if (!searchQuery.trim()) return wallets;
    const query = searchQuery.toLowerCase().trim();
    return wallets.filter(
      (w) =>
        w.walletAddress.toLowerCase().includes(query) ||
        w.userEmail.toLowerCase().includes(query),
    );
  }, [wallets, searchQuery]);

  // Fetch balances for the current page's wallets
  useEffect(() => {
    const { page, pageSize } = paginationModel;
    const pageWallets = filteredWallets.slice(page * pageSize, (page + 1) * pageSize);
    const addressesNeedingBalance = pageWallets
      .map((w) => w.walletAddress)
      .filter((addr) => !(addr in balances));

    if (addressesNeedingBalance.length > 0) {
      dispatch(fetchWalletBalances(addressesNeedingBalance));
    }
  }, [paginationModel, filteredWallets, balances, dispatch]);

  const columns: GridColDef[] = [
    {
      field: "walletAddress",
      headerName: "Wallet Address",
      flex: 2,
      minWidth: 250,
      renderCell: (params) => <WalletAddressCell wallet={params.row as UserWalletDetail} />,
    },
    {
      field: "userEmail",
      headerName: "Email",
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => {
        const wallet = params.row as UserWalletDetail;
        return <Typography variant="body2">{wallet.userEmail}</Typography>;
      },
    },
    {
      field: "balance",
      headerName: "Balance",
      flex: 0.8,
      minWidth: 100,
      renderCell: (params) => {
        const wallet = params.row as UserWalletDetail;
        const balance = balances[wallet.walletAddress];
        if (balance === undefined) {
          return <Skeleton variant="text" width={60} height={24} />;
        }
        return (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {balance}
          </Typography>
        );
      },
    },
    {
      field: "createdOn",
      headerName: "Created On",
      flex: 1,
      minWidth: 160,
      valueGetter: (_value: unknown, row: UserWalletDetail) => row?.createdOn || "",
      renderCell: (params) => {
        const wallet = params.row as UserWalletDetail;
        return (
          <Typography variant="body2">
            {dayjs(wallet.createdOn).format("MMM DD, YYYY HH:mm")}
          </Typography>
        );
      },
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 1, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ color: theme.palette.customText.primary.p1.active }}
        >
          Wallets
        </Typography>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2 }}>
        {searchQuery && (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            Found {filteredWallets.length} wallet{filteredWallets.length !== 1 ? "s" : ""} matching
            &quot;{searchQuery}&quot;
          </Typography>
        )}
        <TextField
          placeholder="Search by wallet address or email"
          sx={{ width: { xs: "100%", md: "40%" } }}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPaginationModel((prev) => ({ ...prev, page: 0 })); }}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearchQuery(""); setPaginationModel((prev) => ({ ...prev, page: 0 })); }} edge="end">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {state === State.loading ? (
        <Box>
          <Box sx={{ display: "flex", gap: 2, px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
            {columns.map((col) => (
              <Skeleton key={col.field} variant="text" height={24} sx={{ flex: col.flex ?? 1 }} />
            ))}
          </Box>
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ display: "flex", gap: 2, px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
              {columns.map((col) => (
                <Skeleton key={col.field} variant="text" height={24} sx={{ flex: col.flex ?? 1 }} />
              ))}
            </Box>
          ))}
        </Box>
      ) : filteredWallets.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 6 }}>
            <StateWithImage
              message={searchQuery ? `No wallets found matching "${searchQuery}".` : "No wallets found."}
              imageUrl={searchQuery ? NoSearchResults : NoDataImage}
            />
          </CardContent>
        </Card>
      ) : (
        <DataGrid
          rows={filteredWallets}
          columns={columns}
          getRowId={(row) => row.walletAddress}
          autoHeight
          density="standard"
          pagination
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25, 50]}
          disableColumnFilter
          disableRowSelectionOnClick
          sx={{
            border: 0,
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
            },
          }}
        />
      )}
    </Container>
  );
}
