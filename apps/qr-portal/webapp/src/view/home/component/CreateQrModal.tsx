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
import { CheckCircle as CheckCircleIcon, Download as DownloadIcon } from "@mui/icons-material";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import { Form, Formik } from "formik";
import QRCode from "qrcode";
import * as Yup from "yup";

import React, { useEffect, useMemo, useState } from "react";

import { CreateQrCodePayload, EmployeeBase, QrCodeEventType, State } from "@/types/types";
import { Role } from "@slices/authSlice/auth";
import { fetchEmployees } from "@slices/employeesSlice/employees";
import { fetchEventTypes } from "@slices/eventTypesSlice/eventTypes";
import { createQrCode } from "@slices/qrSlice/qr";
import { fetchSessions } from "@slices/sessionSlice/session";
import { RootState, useAppDispatch, useAppSelector } from "@slices/store";

interface CreateQrModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onRefresh?: () => void;
}

interface CreateQrFormValues {
  eventType: QrCodeEventType;
  email: string;
  sessionId: string;
  eventTypeName: string;
  coins: number;
  description: string;
}

const CreateQrModal: React.FC<CreateQrModalProps> = ({ open, onClose, onRefresh }) => {
  const dispatch = useAppDispatch();
  const { roles } = useAppSelector((state: RootState) => state.auth);
  const { userInfo } = useAppSelector((state: RootState) => state.user);
  const { sessions } = useAppSelector((state: RootState) => state.session);
  const { eventTypes } = useAppSelector((state: RootState) => state.eventTypes);
  const { employees } = useAppSelector((state: RootState) => state.employees);
  const { state } = useAppSelector((state: RootState) => state.qr);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [createdQrId, setCreatedQrId] = useState<string | null>(null);
  const [selectedEmployeeEmail, setSelectedEmployeeEmail] = useState<string>(userInfo?.workEmail ?? "");

  useEffect(() => {
    if (open) {
      dispatch(fetchEventTypes());
      if (roles.includes(Role.SESSION_ADMIN)) {
        dispatch(fetchSessions());
      }
      if (roles.includes(Role.GENERAL_ADMIN)) {
        dispatch(fetchEmployees());
      }
      // Sync selectedEmployeeEmail with initial email value when modal opens
      setSelectedEmployeeEmail(userInfo?.workEmail ?? "");
    }
  }, [open, dispatch, roles, userInfo?.workEmail]);

  const handleExited = () => {
    setQrImageUrl(null);
    setCreatedQrId(null);
    setSelectedEmployeeEmail(userInfo?.workEmail ?? "");
  };

  const isGeneralAdmin = roles.includes(Role.GENERAL_ADMIN);
  const isSessionAdmin = roles.includes(Role.SESSION_ADMIN);
  const isO2BarAdmin = roles.includes(Role.O2BAR_ADMIN);

  // Filter event types based on user role
  const availableEventTypes = useMemo(() => {
    return eventTypes.filter((eventType) => {
      if (eventType.category === "SESSION") {
        return isSessionAdmin;
      }
      if (eventType.category === "O2BAR") {
        return isGeneralAdmin || isSessionAdmin || isO2BarAdmin;
      }
      if (eventType.category === "GENERAL") {
        return isGeneralAdmin;
      }
      return false;
    });
  }, [eventTypes, isSessionAdmin, isGeneralAdmin, isO2BarAdmin]);

  // Group event types by category for dropdown
  const eventTypeOptions = useMemo(() => {
    const options: Array<{
      value: QrCodeEventType;
      label: string;
      category: "SESSION" | "O2BAR" | "GENERAL";
    }> = [];

    if (isSessionAdmin && eventTypes.some((et) => et.category === "SESSION")) {
      options.push({ value: QrCodeEventType.SESSION, label: "Session", category: "SESSION" });
    }

    if (
      (isGeneralAdmin || isSessionAdmin || isO2BarAdmin) &&
      eventTypes.some((et) => et.category === "O2BAR")
    ) {
      options.push({ value: QrCodeEventType.O2BAR, label: "O2 Bar", category: "O2BAR" });
    }

    if (isGeneralAdmin) {
      const generalTypes = eventTypes.filter((et) => et.category === "GENERAL");
      if (generalTypes.length > 0) {
        options.push({ value: QrCodeEventType.GENERAL, label: "General", category: "GENERAL" });
      }
    }

    return options;
  }, [eventTypes, isSessionAdmin, isGeneralAdmin, isO2BarAdmin]);

  const eventTypeSelectDisabled = eventTypeOptions.length === 1;

  const getDefaultEventType = (): QrCodeEventType => {
    if (isSessionAdmin && eventTypes.some((et) => et.category === "SESSION")) {
      return QrCodeEventType.SESSION;
    }
    if (
      (isGeneralAdmin || isSessionAdmin || isO2BarAdmin) &&
      eventTypes.some((et) => et.category === "O2BAR")
    ) {
      return QrCodeEventType.O2BAR;
    }
    const generalType = eventTypes.find((et) => et.category === "GENERAL");
    if (generalType) {
      return QrCodeEventType.GENERAL;
    }
    return eventTypeOptions[0]?.value ?? QrCodeEventType.O2BAR;
  };

  const getDefaultCoins = (eventType: QrCodeEventType, eventTypeName?: string): number => {
    if (eventType === QrCodeEventType.GENERAL && eventTypeName) {
      const type = eventTypes.find(
        (et) => et.category === "GENERAL" && et.eventTypeName === eventTypeName,
      );
      return type?.defaultCoins ?? 0;
    }
    if (eventType === QrCodeEventType.SESSION) {
      const type = eventTypes.find((et) => et.category === "SESSION");
      return type?.defaultCoins ?? 0;
    }
    if (eventType === QrCodeEventType.O2BAR) {
      const type = eventTypes.find((et) => et.category === "O2BAR");
      return type?.defaultCoins ?? 0;
    }
    return 0;
  };

  const validationSchema = Yup.object().shape({
    eventType: Yup.string().required("Event type is required"),
    email: Yup.string().when("eventType", {
      is: QrCodeEventType.O2BAR,
      then: (schema) => schema.email("Invalid email").required("Email is required"),
      otherwise: (schema) => schema.notRequired(),
    }),
    sessionId: Yup.string().when("eventType", {
      is: QrCodeEventType.SESSION,
      then: (schema) => schema.required("Session is required"),
      otherwise: (schema) => schema.notRequired(),
    }),
    eventTypeName: Yup.string().when("eventType", {
      is: QrCodeEventType.GENERAL,
      then: (schema) => schema.required("Event type name is required"),
      otherwise: (schema) => schema.notRequired(),
    }),
    coins: Yup.number().required("Coins is required").min(0, "Coins must be a positive number"),
    description: Yup.string(),
  });

  const formatPresenters = (presenters: string[]): string => {
    if (presenters.length === 0) return "";
    if (presenters.length === 1) return presenters[0];
    if (presenters.length === 2) return `${presenters[0]} & ${presenters[1]}`;
    return `${presenters[0]} & ${presenters.length - 1} more`;
  };

  const getEmployeeDisplayName = (employee: EmployeeBase): string => {
    const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ");
    return fullName || employee.workEmail;
  };

  const filterEmployeeOptions = (
    options: EmployeeBase[],
    { inputValue }: { inputValue: string },
  ): EmployeeBase[] => {
    if (!inputValue || inputValue.length < 2) {
      return options.slice(0, 50);
    }
    const searchTerm = inputValue.toLowerCase();
    const filtered = options.filter((option) => {
      const fullName = [option.firstName, option.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const email = option.workEmail.toLowerCase();
      return fullName.includes(searchTerm) || email.includes(searchTerm);
    });
    return filtered.slice(0, 100);
  };

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.workEmail === selectedEmployeeEmail) || null;
  }, [employees, selectedEmployeeEmail]);

  const handleSubmit = async (values: CreateQrFormValues) => {
    let info;
    if (values.eventType === QrCodeEventType.SESSION) {
      info = {
        eventType: "SESSION" as const,
        sessionId: values.sessionId,
      };
    } else if (values.eventType === QrCodeEventType.GENERAL) {
      info = {
        eventType: "GENERAL" as const,
        eventTypeName: values.eventTypeName,
      };
    } else {
      info = {
        eventType: "O2BAR" as const,
        email: values.email,
      };
    }

    const payload: CreateQrCodePayload = {
      info,
      description: values.description || undefined,
      coins: Number(values.coins),
    };

    const result = await dispatch(createQrCode(payload));
    if (createQrCode.fulfilled.match(result)) {
      const qrId = result.payload.qrId;
      setCreatedQrId(qrId);
      // Generate QR code image
      try {
        const qrDataUrl = await QRCode.toDataURL(qrId, {
          width: 300,
          margin: 2,
        });
        setQrImageUrl(qrDataUrl);
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      }
      // Refresh the QR codes list immediately (without closing modal)
      if (onRefresh) {
        onRefresh();
      }
    }
  };

  const handleDownload = async () => {
    if (!qrImageUrl || !createdQrId) return;
    const link = document.createElement("a");
    link.download = `qr-code-${createdQrId}.png`;
    link.href = qrImageUrl;
    link.click();
  };

  const handleClose = () => {
    if (createdQrId && onRefresh) {
      onRefresh();
    }
    onClose();
  };

  const getInitialEventTypeName = (): string => {
    const generalType = availableEventTypes.find((et) => et.category === "GENERAL");
    return generalType?.eventTypeName ?? "";
  };

  const getInitialCoins = (): number => {
    const defaultEventType = eventTypeOptions[0]?.value ?? getDefaultEventType();
    if (defaultEventType === QrCodeEventType.GENERAL) {
      const firstGeneralType = availableEventTypes.find((et) => et.category === "GENERAL");
      return firstGeneralType?.defaultCoins ?? 0;
    }
    return getDefaultCoins(defaultEventType);
  };

  const initialValues = {
    eventType: eventTypeOptions[0]?.value ?? getDefaultEventType(),
    email: userInfo?.workEmail ?? "",
    sessionId: "",
    eventTypeName: getInitialEventTypeName(),
    coins: getInitialCoins(),
    description: "",
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onExited: handleExited }}
    >
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => {
          const canEditCoins =
            isGeneralAdmin || (isSessionAdmin && values.eventType === QrCodeEventType.SESSION);

          const handleEventTypeChange = (
            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
          ) => {
            const newEventType = e.target.value as QrCodeEventType;
            handleChange(e);
            if (newEventType === QrCodeEventType.O2BAR && !isGeneralAdmin && userInfo) {
              setFieldValue("email", userInfo.workEmail);
              setSelectedEmployeeEmail(userInfo.workEmail);
            }
            if (newEventType === QrCodeEventType.GENERAL) {
              const firstGeneralType = availableEventTypes.find((et) => et.category === "GENERAL");
              if (firstGeneralType) {
                setFieldValue("eventTypeName", firstGeneralType.eventTypeName);
                setFieldValue("coins", firstGeneralType.defaultCoins);
              }
            } else {
              setFieldValue("coins", getDefaultCoins(newEventType));
              setFieldValue("eventTypeName", "");
            }
          };

          const handleEventTypeNameChange = (
            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
          ) => {
            handleChange(e);
            const selectedType = eventTypes.find(
              (et) => et.category === "GENERAL" && et.eventTypeName === e.target.value,
            );
            if (selectedType) {
              setFieldValue("coins", selectedType.defaultCoins);
            }
          };

          return (
            <Form>
              <DialogTitle>Create QR Code</DialogTitle>
              <DialogContent>
                {createdQrId && qrImageUrl ? (
                  <Box sx={{ py: 2 }}>
                    <Stack spacing={3} alignItems="center">
                      <Box sx={{ textAlign: "center" }}>
                        <CheckCircleIcon
                          sx={{
                            fontSize: 48,
                            color: "success.main",
                            mb: 1,
                          }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          QR Code Created Successfully!
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Your QR code is ready to download
                        </Typography>
                      </Box>

                      <Divider sx={{ width: "100%" }} />

                      <Box
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                              ? alpha(theme.palette.common.white, 0.05)
                              : alpha(theme.palette.common.black, 0.02),
                          border: 1,
                          borderColor: "divider",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <img
                          src={qrImageUrl}
                          alt="QR Code"
                          style={{
                            width: "100%",
                            maxWidth: "280px",
                            height: "auto",
                            aspectRatio: "1",
                            display: "block",
                          }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: "monospace" }}
                        >
                          ID: {createdQrId}
                        </Typography>
                      </Box>

                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{ width: "100%", justifyContent: "center" }}
                      >
                        <Button
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          onClick={handleDownload}
                          size="large"
                          sx={{
                            minWidth: 200,
                            fontWeight: 600,
                          }}
                        >
                          Download QR Code
                        </Button>
                        <Button
                          variant="outlined"
                          color="secondary"
                          onClick={handleClose}
                          size="large"
                          sx={{
                            minWidth: 200,
                            fontWeight: 600,
                          }}
                        >
                          Done
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ) : (
                  <>
                    <TextField
                      fullWidth
                      select
                      label="Event Type"
                      name="eventType"
                      value={values.eventType}
                      onChange={handleEventTypeChange}
                      onBlur={handleBlur}
                      error={touched.eventType && !!errors.eventType}
                      helperText={
                        touched.eventType && errors.eventType
                          ? errors.eventType
                          : eventTypeSelectDisabled
                            ? `Only ${eventTypeOptions[0]?.label ?? "this"} events are available for your role`
                            : undefined
                      }
                      disabled={eventTypeSelectDisabled}
                      sx={{ mb: 2, mt: 1 }}
                    >
                      {eventTypeOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>

                    {values.eventType === QrCodeEventType.GENERAL && (
                      <TextField
                        fullWidth
                        select
                        label="General Event Type"
                        name="eventTypeName"
                        value={values.eventTypeName}
                        onChange={handleEventTypeNameChange}
                        onBlur={handleBlur}
                        error={touched.eventTypeName && !!errors.eventTypeName}
                        helperText={touched.eventTypeName && errors.eventTypeName}
                        sx={{ mb: 2 }}
                      >
                        {availableEventTypes
                          .filter((et) => et.category === "GENERAL")
                          .map((et) => (
                            <MenuItem key={et.eventTypeName} value={et.eventTypeName}>
                              {et.eventTypeName}
                              {et.description && (
                                <Typography
                                  component="span"
                                  variant="body2"
                                  sx={{ ml: 1, color: "text.secondary" }}
                                >
                                  - {et.description}
                                </Typography>
                              )}
                            </MenuItem>
                          ))}
                      </TextField>
                    )}

                    {values.eventType === QrCodeEventType.O2BAR && (
                      <>
                        {isGeneralAdmin ? (
                          <Autocomplete<EmployeeBase>
                            fullWidth
                            options={employees}
                            getOptionLabel={getEmployeeDisplayName}
                            value={selectedEmployee}
                            onChange={(_, newValue) => {
                              const email = newValue?.workEmail || "";
                              setFieldValue("email", email);
                              setSelectedEmployeeEmail(email);
                            }}
                            onBlur={handleBlur}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Employee"
                                name="email"
                                error={touched.email && !!errors.email}
                                helperText={
                                  touched.email && errors.email
                                    ? errors.email
                                    : "Search and select an employee for this O2 Bar QR code"
                                }
                                sx={{ mb: 2 }}
                              />
                            )}
                            renderOption={(props, option) => (
                              <Box component="li" {...props} key={option.workEmail}>
                                <Box>
                                  <Typography variant="body1">
                                    {getEmployeeDisplayName(option)}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {option.workEmail}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                            filterOptions={filterEmployeeOptions}
                            isOptionEqualToValue={(option, value) => option.workEmail === value.workEmail}
                            ListboxProps={{
                              style: { maxHeight: "300px" },
                            }}
                          />
                        ) : (
                          <TextField
                            fullWidth
                            label="Employee"
                            name="email"
                            value={values.email}
                            disabled
                            helperText="Your email address (cannot be changed)"
                            sx={{ mb: 2 }}
                          />
                        )}
                      </>
                    )}

                    {values.eventType === QrCodeEventType.SESSION && (
                      <TextField
                        fullWidth
                        select
                        label="Session"
                        name="sessionId"
                        value={values.sessionId}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.sessionId && !!errors.sessionId}
                        helperText={touched.sessionId && errors.sessionId}
                        sx={{ mb: 2 }}
                      >
                        {sessions.map((session) => {
                          const presentersText = session.presenters?.length
                            ? formatPresenters(session.presenters)
                            : "";

                          return (
                            <MenuItem key={session.id} value={session.id}>
                              <Typography variant="body1">
                                {session.name}
                                {presentersText && (
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    sx={{ ml: 1, color: "text.secondary" }}
                                  >
                                    - {presentersText}
                                  </Typography>
                                )}
                              </Typography>
                            </MenuItem>
                          );
                        })}
                      </TextField>
                    )}

                    <TextField
                      fullWidth
                      label="Coins"
                      name="coins"
                      type="number"
                      value={values.coins}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.coins && !!errors.coins}
                      helperText={
                        touched.coins && errors.coins
                          ? errors.coins
                          : canEditCoins
                            ? "Number of coins to award for this QR code"
                            : "You cannot modify the amount of coins"
                      }
                      inputProps={{ min: 0, step: 0.01 }}
                      disabled={!canEditCoins}
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      fullWidth
                      label="Description"
                      name="description"
                      value={values.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      multiline
                      rows={3}
                      placeholder="Enter a description to identify the purpose of this QR code (e.g., 'Networking event - Day 1', 'John Doe - O2 Bar')"
                      helperText="Optional: Add a description to help identify this QR code later"
                      sx={{ mb: 2 }}
                    />
                  </>
                )}
              </DialogContent>
              {!createdQrId && (
                <DialogActions>
                  <Button onClick={handleClose}>Cancel</Button>
                  <Button type="submit" variant="contained" disabled={state === State.loading}>
                    {state === State.loading ? <CircularProgress size={20} /> : "Create"}
                  </Button>
                </DialogActions>
              )}
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
};

export default CreateQrModal;
