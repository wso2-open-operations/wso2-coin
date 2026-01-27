// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Category as CategoryIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Event as EventIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  Person as PersonIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Pagination,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import dayjs from "dayjs";
import QRCode from "qrcode";

import React, { useEffect, useMemo, useState } from "react";

import { ConferenceQrCode, State } from "@/types/types";
import NoSearchResults from "@assets/images/no-search-results.svg";
import StateWithImage from "@component/ui/StateWithImage";
import { useConfirmationModalContext } from "@context/DialogContext";
import { Role } from "@slices/authSlice/auth";
import { fetchEmployees } from "@slices/employeesSlice/employees";
import { fetchEventTypes } from "@slices/eventTypesSlice/eventTypes";
import { deleteQrCode, fetchQrCodes, setLimit, setOffset } from "@slices/qrSlice/qr";
import { fetchSessions } from "@slices/sessionSlice/session";
import { RootState, useAppDispatch, useAppSelector } from "@slices/store";
import { ConfirmationType } from "@utils/types";

import CreateQrModal from "./component/CreateQrModal";

type ViewMode = "grid" | "list";

export default function QrPortal() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { showConfirmation } = useConfirmationModalContext();
  const { qrCodes, state, limit, offset, totalCount } = useAppSelector(
    (state: RootState) => state.qr,
  );
  const { sessions } = useAppSelector((state: RootState) => state.session);
  const { eventTypes } = useAppSelector((state: RootState) => state.eventTypes);
  const { employees } = useAppSelector((state: RootState) => state.employees);
  const { userInfo } = useAppSelector((state: RootState) => state.user);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(0);

  const { roles } = useAppSelector((state: RootState) => state.auth);
  const isGeneralAdmin = roles.includes(Role.GENERAL_ADMIN);

  useEffect(() => {
    dispatch(fetchQrCodes({ limit, offset }));
    // Fetch sessions for search functionality
    dispatch(fetchSessions());
    // Fetch event types for display
    dispatch(fetchEventTypes());
    // Fetch employees if general admin
    if (isGeneralAdmin) {
      dispatch(fetchEmployees());
    }
  }, [dispatch, limit, offset, isGeneralAdmin]);

  // Update page when offset changes
  useEffect(() => {
    setPage(Math.floor(offset / limit));
  }, [offset, limit]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, newPage: number) => {
    // Pagination component uses 1-indexed pages, convert to 0-indexed
    const pageIndex = newPage - 1;
    const newOffset = pageIndex * limit;
    dispatch(setOffset(newOffset));
  };

  const handlePageSizeChange = (newPageSize: number) => {
    dispatch(setLimit(newPageSize));
    dispatch(setOffset(0));
    setPage(0);
  };

  useEffect(() => {
    // Ensure list view is not accessible on mobile
    if (isMobile && viewMode !== "grid") {
      setViewMode("grid");
    }
  }, [isMobile, viewMode]);

  useEffect(() => {
    // Generate QR code images for all QR codes
    const generateQrImages = async () => {
      const images: Record<string, string> = {};
      for (const qr of qrCodes) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr.qrId, {
            width: 200,
            margin: 2,
          });
          images[qr.qrId] = qrDataUrl;
        } catch (error) {
          console.error(`Failed to generate QR code for ${qr.qrId}:`, error);
        }
      }
      setQrImages(images);
    };

    if (qrCodes.length > 0) {
      generateQrImages();
    }
  }, [qrCodes]);

  const handleDownload = async (qrId: string) => {
    try {
      const qrDataUrl = qrImages[qrId] || (await QRCode.toDataURL(qrId, { width: 400, margin: 2 }));
      const link = document.createElement("a");
      link.download = `qr-code-${qrId}.png`;
      link.href = qrDataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to download QR code:", error);
    }
  };

  const handleDelete = (qrId: string) => {
    showConfirmation(
      "Delete QR Code",
      `Are you sure you want to delete the QR code? This action cannot be undone.`,
      ConfirmationType.delete,
      async () => {
        const result = await dispatch(deleteQrCode(qrId));
        if (deleteQrCode.fulfilled.match(result)) {
          // Remove from images cache
          const newImages = { ...qrImages };
          delete newImages[qrId];
          setQrImages(newImages);
          // Refresh the list
          dispatch(fetchQrCodes({ limit, offset }));
        }
      },
      "Delete",
      "Cancel",
    );
  };

  // Filter QR codes based on search query
  const filteredQrCodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return qrCodes;
    }

    const query = searchQuery.toLowerCase().trim();
    return qrCodes.filter((qr: ConferenceQrCode) => {
      // Search in description
      if (qr.description?.toLowerCase().includes(query)) {
        return true;
      }

      // Search in email and name (for O2BAR)
      if (qr.info.eventType === "O2BAR") {
        const o2barInfo = qr.info as { eventType: "O2BAR"; email: string };
        if (o2barInfo.email?.toLowerCase().includes(query)) {
          return true;
        }
        const employeeDisplayName = getEmployeeDisplayName(o2barInfo.email).toLowerCase();
        if (employeeDisplayName.includes(query.toLowerCase())) {
          return true;
        }
      }

      // Search in session ID or session name (for SESSION)
      if (qr.info.eventType === "SESSION") {
        const sessionInfo = qr.info as { eventType: "SESSION"; sessionId: string };
        if (sessionInfo.sessionId?.toLowerCase().includes(query)) {
          return true;
        }
        // Try to find session name or presenters
        const session = sessions.find((s) => s.id === sessionInfo.sessionId);
        if (session) {
          if (session.name?.toLowerCase().includes(query)) {
            return true;
          }
          if (session.presenters?.some((presenter) => presenter.toLowerCase().includes(query))) {
            return true;
          }
        }
      }

      // Search in eventTypeName (for GENERAL)
      if (qr.info.eventType === "GENERAL") {
        const generalInfo = qr.info as { eventType: "GENERAL"; eventTypeName: string };
        if (generalInfo.eventTypeName?.toLowerCase().includes(query)) {
          return true;
        }
      }

      // Search in QR ID
      if (qr.qrId.toLowerCase().includes(query)) {
        return true;
      }

      return false;
    });
  }, [qrCodes, searchQuery, sessions, employees]);

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    dispatch(fetchQrCodes({ limit, offset }));
  };

  const handleRefresh = () => {
    dispatch(fetchQrCodes({ limit, offset }));
  };

  const getDeletePermission = (qr: ConferenceQrCode, loggedInEmail: string) => {
    const isDeleteDisabled =
      !qr.createdBy || !loggedInEmail || qr.createdBy.toLowerCase() !== loggedInEmail;
    const deleteTooltipTitle = isDeleteDisabled
      ? "You don't have permission to delete this"
      : "Delete QR Code";
    return { isDeleteDisabled, deleteTooltipTitle };
  };

  const toTitleCase = (str: string): string => {
    if (str.toUpperCase() === "SESSION" || str.toUpperCase() === "O2BAR") {
      return str.toUpperCase() === "SESSION" ? "Session" : "O2 Bar";
    }
    
    const withSpaces = str.replace(/([a-z])([A-Z])/g, "$1 $2");
    
    return withSpaces
      .toLowerCase()
      .split(/[\s_-]+/)
      .map((word) => {
        if (/^[0-9]/.test(word) || word === "o2") {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  };
  const getEventTypeDisplayName = (qr: ConferenceQrCode): string => {
    if (qr.info.eventType === "SESSION") {
      const sessionType = eventTypes.find((et) => et.category === "SESSION");
      const name = sessionType?.eventTypeName ?? "Session";
      return toTitleCase(name);
    }
    if (qr.info.eventType === "O2BAR") {
      const o2barType = eventTypes.find((et) => et.category === "O2BAR");
      const name = o2barType?.eventTypeName ?? "O2 Bar";
      return toTitleCase(name);
    }
    if (qr.info.eventType === "GENERAL") {
      const generalInfo = qr.info as { eventType: "GENERAL"; eventTypeName: string };
      return toTitleCase(generalInfo.eventTypeName);
    }
    return "Unknown";
  };

  const getEmployeeDisplayName = (email: string): string => {
    const employee = employees.find((e) => e.workEmail === email);
    if (employee) {
      const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ");
      return fullName || email;
    }
    return email;
  };

  // DataGrid columns for list view
  const loggedInEmail = userInfo?.workEmail?.toLowerCase() ?? "";

  const columns: GridColDef[] = [
    {
      field: "title",
      headerName: "Title",
      flex: 1.5,
      minWidth: 200,
      valueGetter: (_value: any, row: ConferenceQrCode) => {
        if (!row || !row.info) return "";
        if (row.info.eventType === "SESSION") {
          const sessionInfo = row.info as { eventType: "SESSION"; sessionId: string };
          const session = sessions.find((s) => s.id === sessionInfo.sessionId);
          return session ? session.name : `Session ID: ${sessionInfo.sessionId}`;
        } else if (row.info.eventType === "GENERAL") {
          const generalInfo = row.info as { eventType: "GENERAL"; eventTypeName: string };
          return generalInfo.eventTypeName;
        } else {
          const o2barInfo = row.info as { eventType: "O2BAR"; email: string };
          return getEmployeeDisplayName(o2barInfo.email);
        }
      },
      renderCell: (params) => {
        const qr = params.row as ConferenceQrCode;
        if (qr.info.eventType === "SESSION") {
          const sessionInfo = qr.info as { eventType: "SESSION"; sessionId: string };
          const session = sessions.find((s) => s.id === sessionInfo.sessionId);
          return session ? session.name : `Session ID: ${sessionInfo.sessionId}`;
        } else if (qr.info.eventType === "GENERAL") {
          const generalInfo = qr.info as { eventType: "GENERAL"; eventTypeName: string };
          return generalInfo.eventTypeName;
        } else {
          const o2barInfo = qr.info as { eventType: "O2BAR"; email: string };
          return getEmployeeDisplayName(o2barInfo.email);
        }
      },
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1.5,
      minWidth: 200,
      valueGetter: (_value: any, row: ConferenceQrCode) => {
        return row?.description || "";
      },
      renderCell: (params) => {
        const qr = params.row as ConferenceQrCode;
        return qr.description || "-";
      },
    },
    {
      field: "type",
      headerName: "Type",
      flex: 1,
      minWidth: 120,
      valueGetter: (_value: any, row: ConferenceQrCode) => {
        if (!row || !row.info) return "";
        return getEventTypeDisplayName(row);
      },
      renderCell: (params) => {
        const qr = params.row as ConferenceQrCode;
        return getEventTypeDisplayName(qr);
      },
    },
    {
      field: "coins",
      headerName: "Coins",
      flex: 0.8,
      minWidth: 100,
      valueGetter: (_value: any, row: ConferenceQrCode) => {
        return row?.coins ?? 0;
      },
      renderCell: (params) => {
        const qr = params.row as ConferenceQrCode;
        return (
          <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
            {qr.coins ?? 0} coin{(qr.coins ?? 0) !== 1 ? "s" : ""}
          </Typography>
        );
      },
    },
    {
      field: "createdOn",
      headerName: "Created At",
      flex: 1,
      minWidth: 150,
      valueGetter: (_value: any, row: ConferenceQrCode) => {
        // Return the raw date string for proper sorting
        return row?.createdOn || "";
      },
      renderCell: (params) => {
        const qr = params.row as ConferenceQrCode;
        const formattedDate = dayjs(qr.createdOn).format("MMM DD, YYYY");
        return (
          <Typography variant="body2" component="span">
            {formattedDate}
          </Typography>
        );
      },
    },
    {
      field: "createdBy",
      headerName: "Created By",
      flex: 1.2,
      minWidth: 180,
      valueGetter: (_value: any, row: ConferenceQrCode) => {
        return row?.createdBy || "Unknown";
      },
      renderCell: (params) => {
        const qr = params.row as ConferenceQrCode;
        const createdBy = qr.createdBy || "Unknown";

        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              gap: 0.5,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <PersonIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {createdBy}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => {
        const qr = params.row as ConferenceQrCode;
        const { isDeleteDisabled, deleteTooltipTitle } = getDeletePermission(qr, loggedInEmail);

        return (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", height: "100%" }}>
            <Tooltip title="Download QR Code" arrow enterDelay={300}>
              <IconButton size="small" color="primary" onClick={() => handleDownload(qr.qrId)}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={deleteTooltipTitle} arrow enterDelay={300}>
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  cursor: isDeleteDisabled ? "not-allowed" : "pointer",
                }}
              >
                <IconButton
                  size="small"
                  color={isDeleteDisabled ? "default" : "error"}
                  onClick={isDeleteDisabled ? undefined : () => handleDelete(qr.qrId)}
                  disabled={isDeleteDisabled}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  const effectiveViewMode: ViewMode = isMobile ? "grid" : viewMode;

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 } }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 3,
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            color: theme.palette.customText.primary.p1.active,
          }}
        >
          Conference QR Codes
        </Typography>
        <Box
          sx={{ display: "flex", gap: 2, alignItems: "center", width: { xs: "100%", sm: "auto" } }}
        >
          {!isMobile && (
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newView) => {
                if (newView !== null) {
                  setViewMode(newView);
                }
              }}
              size="small"
              aria-label="view mode"
            >
              <Tooltip title="Grid View" arrow enterDelay={300}>
                <ToggleButton value="grid" aria-label="grid view">
                  <GridViewIcon />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="List View" arrow enterDelay={300}>
                <ToggleButton value="list" aria-label="list view">
                  <ListViewIcon />
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
            fullWidth={isMobile}
            size="medium"
          >
            Create QR
          </Button>
        </Box>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by description, email, session, or QR ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery("")} edge="end">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        {searchQuery && (
          <Typography variant="body2" color="text.secondary">
            Found {filteredQrCodes.length} QR code{filteredQrCodes.length !== 1 ? "s" : ""} matching
            "{searchQuery}"
          </Typography>
        )}
      </Box>

      {state === State.loading && qrCodes.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredQrCodes.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 6 }}>
            <StateWithImage
              message={
                searchQuery
                  ? `No QR codes found matching "${searchQuery}". Try a different search term.`
                  : "No QR codes found. Create your first QR code!"
              }
              imageUrl={NoSearchResults}
            />
          </CardContent>
        </Card>
      ) : effectiveViewMode === "grid" ? (
        <>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {filteredQrCodes.map((qr) => {
              const isSession = qr.info.eventType === "SESSION";
              const isGeneral = qr.info.eventType === "GENERAL";
              const sessionInfo = isSession
                ? (qr.info as { eventType: "SESSION"; sessionId: string })
                : null;
              const o2barInfo =
                !isSession && !isGeneral
                  ? (qr.info as { eventType: "O2BAR"; email: string })
                  : null;
              const generalInfo = isGeneral
                ? (qr.info as { eventType: "GENERAL"; eventTypeName: string })
                : null;
              const session =
                isSession && sessionInfo
                  ? sessions.find((s) => s.id === sessionInfo.sessionId)
                  : null;
              const eventTypeDisplayName = isGeneral
                ? "General"
                : getEventTypeDisplayName(qr);

              const { isDeleteDisabled, deleteTooltipTitle } = getDeletePermission(
                qr,
                loggedInEmail,
              );

              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={qr.qrId}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardContent
                      sx={{ flexGrow: 1, display: "flex", flexDirection: "column", p: 2.5 }}
                    >
                      {/* Header: Type Badge and Actions */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 2,
                        }}
                      >
                        <Chip
                          icon={
                            isSession ? <EventIcon /> : isGeneral ? <CategoryIcon /> : <EmailIcon />
                          }
                          label={eventTypeDisplayName}
                          color="default"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                        <Tooltip title={deleteTooltipTitle} arrow>
                          <Box
                            component="span"
                            sx={{
                              display: "inline-flex",
                              cursor: isDeleteDisabled ? "not-allowed" : "pointer",
                            }}
                          >
                            <IconButton
                              size="small"
                              color={isDeleteDisabled ? "default" : "error"}
                              onClick={isDeleteDisabled ? undefined : () => handleDelete(qr.qrId)}
                              disabled={isDeleteDisabled}
                              sx={{ ml: 1 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Tooltip>
                      </Box>

                      {/* Title Section */}
                      <Box sx={{ mb: 1.5 }}>
                        <Typography
                          variant="h6"
                          component="h2"
                          sx={{
                            mb: 0.5,
                            lineHeight: 1.3,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {isSession ? (
                            <>{session ? session.name : `Session: ${sessionInfo?.sessionId}`}</>
                          ) : isGeneral ? (
                            <>{generalInfo?.eventTypeName}</>
                          ) : (
                            <>{o2barInfo ? getEmployeeDisplayName(o2barInfo.email) : ""}</>
                          )}
                        </Typography>
                        {qr.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mt: 0.5,
                              lineHeight: 1.5,
                            }}
                          >
                            {qr.description}
                          </Typography>
                        )}
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      {/* QR Code Display */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          mb: 2,
                          flexGrow: 1,
                          minHeight: { xs: 180, sm: 200 },
                          borderRadius: 2,
                          p: 2,
                        }}
                      >
                        {qrImages[qr.qrId] ? (
                          <img
                            src={qrImages[qr.qrId]}
                            alt={`QR Code ${qr.qrId}`}
                            style={{
                              width: "100%",
                              maxWidth: "180px",
                              height: "auto",
                              aspectRatio: "1",
                            }}
                          />
                        ) : (
                          <CircularProgress size={150} />
                        )}
                      </Box>

                      {/* Metadata Footer */}
                      <Box sx={{ mt: "auto" }}>
                        <Divider sx={{ mb: 1.5 }} />
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: { xs: 1, sm: 1.5 },
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <Tooltip
                              title={`Created at: ${dayjs(qr.createdOn).format("MMM DD, YYYY")}`}
                              arrow
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  flexShrink: 0,
                                }}
                              >
                                <CalendarIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ whiteSpace: "nowrap" }}
                                >
                                  {dayjs(qr.createdOn).format("MMM DD, YYYY")}
                                </Typography>
                              </Box>
                            </Tooltip>
                            <Tooltip title={`Amount of coins: ${qr.coins}`} arrow>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  flexShrink: 0,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ whiteSpace: "nowrap", fontWeight: 500 }}
                                >
                                  {qr.coins} coin{qr.coins !== 1 ? "s" : ""}
                                </Typography>
                              </Box>
                            </Tooltip>
                            <Tooltip title={`Created by: ${qr.createdBy || "Unknown"}`} arrow>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  minWidth: 0,
                                  overflow: "hidden",
                                }}
                              >
                                <PersonIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {qr.createdBy || "Unknown"}
                                </Typography>
                              </Box>
                            </Tooltip>
                          </Box>
                          <Tooltip title="Download QR Code" arrow>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleDownload(qr.qrId)}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          {!searchQuery && totalCount > limit && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Stack spacing={2}>
                <Pagination
                  count={Math.ceil(totalCount / limit)}
                  page={page + 1}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
                <Typography variant="caption" color="text.secondary" align="center">
                  Showing {offset + 1}-{Math.min(offset + limit, totalCount)} of {totalCount} QR
                  codes
                </Typography>
              </Stack>
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ width: "100%" }}>
          <DataGrid
            rows={filteredQrCodes}
            columns={columns}
            getRowId={(row) => row.qrId}
            pagination
            autoHeight
            paginationMode={searchQuery ? "client" : "server"}
            rowCount={searchQuery ? filteredQrCodes.length : totalCount}
            paginationModel={{ page: page, pageSize: limit }}
            onPaginationModelChange={(model) => {
              if (searchQuery) {
                setPage(model.page);
              } else {
                if (model.page !== page) {
                  handlePageChange({} as React.ChangeEvent<unknown>, model.page + 1);
                }
                if (model.pageSize !== limit) {
                  handlePageSizeChange(model.pageSize);
                }
              }
            }}
            pageSizeOptions={[5, 10, 20, 50]}
            disableColumnFilter
            disableColumnResize
            disableRowSelectionOnClick
            sx={{
              border: 0,
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid",
                borderColor: "divider",
              },
            }}
          />
        </Box>
      )}

      <CreateQrModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        onRefresh={handleRefresh}
      />
      <Box sx={{ height: 36 }} />
    </Container>
  );
}
