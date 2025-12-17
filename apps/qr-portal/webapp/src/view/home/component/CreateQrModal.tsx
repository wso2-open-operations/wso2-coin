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

import { CreateQrCodePayload, QrCodeEventType } from "@/types/types";
import { Role } from "@slices/authSlice/auth";
import { createQrCode } from "@slices/qrSlice/qr";
import { fetchSessions } from "@slices/sessionSlice/session";
import { RootState, useAppDispatch, useAppSelector } from "@slices/store";

interface CreateQrModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onRefresh?: () => void;
}

const CreateQrModal: React.FC<CreateQrModalProps> = ({ open, onClose, onRefresh }) => {
  const dispatch = useAppDispatch();
  const { roles } = useAppSelector((state: RootState) => state.auth);
  const { userInfo } = useAppSelector((state: RootState) => state.user);
  const { sessions } = useAppSelector((state: RootState) => state.session);
  const { state } = useAppSelector((state: RootState) => state.qr);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [createdQrId, setCreatedQrId] = useState<string | null>(null);

  useEffect(() => {
    if (open && roles.includes(Role.SESSION_ADMIN)) {
      dispatch(fetchSessions());
    }
  }, [open, dispatch, roles]);

  const handleExited = () => {
    setQrImageUrl(null);
    setCreatedQrId(null);
  };

  const isO2BarAdmin = roles.includes(Role.O2_BAR_ADMIN);
  const isSessionAdmin = roles.includes(Role.SESSION_ADMIN);

  const eventTypeOptions = useMemo(() => {
    const options: { value: QrCodeEventType; label: string }[] = [
      { value: QrCodeEventType.O2BAR, label: "O2 Bar" },
    ];

    if (isSessionAdmin) {
      options.push({ value: QrCodeEventType.SESSION, label: "Session" });
    }

    return options;
  }, [isSessionAdmin]);

  const eventTypeSelectDisabled = eventTypeOptions.length === 1;

  // Determine default event type based on role
  const getDefaultEventType = (): QrCodeEventType => {
    if (isSessionAdmin) return QrCodeEventType.SESSION;
    return QrCodeEventType.O2BAR;
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
    description: Yup.string(),
  });

  const formatPresenters = (presenters: string[]): string => {
    if (presenters.length === 0) return "";
    if (presenters.length === 1) return presenters[0];
    if (presenters.length === 2) return `${presenters[0]} & ${presenters[1]}`;
    return `${presenters[0]} & ${presenters.length - 1} more`;
  };

  const handleSubmit = async (values: any) => {
    const payload: CreateQrCodePayload = {
      info:
        values.eventType === QrCodeEventType.SESSION
          ? {
              eventType: "SESSION",
              sessionId: values.sessionId,
            }
          : {
              eventType: "O2BAR",
              email: values.email,
            },
      description: values.description || undefined,
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

  const initialValues = {
    eventType: eventTypeOptions[0]?.value ?? getDefaultEventType(),
    email: userInfo?.workEmail ?? "",
    sessionId: "",
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
          // Reset email to user's email when switching to O2 Bar (for non-O2 Bar Admins)
          const handleEventTypeChange = (
            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
          ) => {
            handleChange(e);
            if (e.target.value === QrCodeEventType.O2BAR && !isO2BarAdmin && userInfo) {
              setFieldValue("email", userInfo.workEmail);
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

                    {values.eventType === QrCodeEventType.O2BAR && (
                      <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={values.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.email && !!errors.email}
                        helperText={
                          touched.email && errors.email
                            ? errors.email
                            : isO2BarAdmin
                              ? "Enter the email address for this O2 Bar QR code"
                              : "Your email address (cannot be changed)"
                        }
                        disabled={!isO2BarAdmin}
                        sx={{ mb: 2 }}
                      />
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
                  <Button type="submit" variant="contained" disabled={state === "loading"}>
                    {state === "loading" ? <CircularProgress size={20} /> : "Create"}
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
