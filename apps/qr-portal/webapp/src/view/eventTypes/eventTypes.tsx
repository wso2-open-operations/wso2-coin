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
// software distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { Form, Formik } from "formik";
import * as Yup from "yup";

import { useEffect, useState } from "react";

import { ConferenceEventType, State } from "@/types/types";
import NoDataImage from "@assets/images/no-data.svg";
import StateWithImage from "@component/ui/StateWithImage";
import { useConfirmationModalContext } from "@context/DialogContext";
import {
  createEventType,
  deleteEventType,
  fetchEventTypes,
  updateEventType,
} from "@slices/eventTypesSlice/eventTypes";
import { RootState, useAppDispatch, useAppSelector } from "@slices/store";
import { ConfirmationType } from "@utils/types";

interface EventTypeFormValues {
  eventTypeName: string;
  category: "GENERAL";
  description: string;
  defaultCoins: number;
}

export default function EventTypesManagement() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const { showConfirmation } = useConfirmationModalContext();
  const { eventTypes, state } = useAppSelector((state: RootState) => state.eventTypes);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEventType, setEditingEventType] = useState<ConferenceEventType | null>(null);

  useEffect(() => {
    dispatch(fetchEventTypes());
  }, [dispatch]);

  const generalEventTypes = eventTypes.filter((et) => et.category === "GENERAL");
  const systemEventTypes = eventTypes.filter((et) => et.category !== "GENERAL");

  const validationSchema = Yup.object().shape({
    eventTypeName: Yup.string()
      .required("Event type name is required")
      .min(1, "Event type name must be at least 1 character")
      .max(100, "Event type name must be less than 100 characters"),
    description: Yup.string().max(500, "Description must be less than 500 characters"),
    defaultCoins: Yup.number()
      .required("Default coins is required")
      .min(0, "Default coins must be a positive number"),
  });

  const handleCreate = async (values: EventTypeFormValues) => {
    const result = await dispatch(
      createEventType({
        ...values,
        defaultCoins: Number(values.defaultCoins),
      }),
    );
    if (createEventType.fulfilled.match(result)) {
      setCreateModalOpen(false);
      dispatch(fetchEventTypes());
    }
  };

  const handleEdit = (eventType: ConferenceEventType) => {
    setEditingEventType(eventType);
    setEditModalOpen(true);
  };

  const handleUpdate = async (values: EventTypeFormValues) => {
    if (!editingEventType) return;
    const result = await dispatch(
      updateEventType({
        eventTypeName: editingEventType.eventTypeName,
        description: values.description,
        defaultCoins: Number(values.defaultCoins),
      }),
    );
    if (updateEventType.fulfilled.match(result)) {
      setEditModalOpen(false);
      setEditingEventType(null);
      dispatch(fetchEventTypes());
    }
  };

  const handleDelete = (eventType: ConferenceEventType) => {
    showConfirmation(
      "Delete Event Type",
      `Are you sure you want to delete the event type "${eventType.eventTypeName}"? This action cannot be undone.`,
      ConfirmationType.delete,
      async () => {
        const result = await dispatch(deleteEventType(eventType.eventTypeName));
        if (deleteEventType.fulfilled.match(result)) {
          dispatch(fetchEventTypes());
        }
      },
      "Delete",
      "Cancel",
    );
  };

  const initialCreateValues: EventTypeFormValues = {
    eventTypeName: "",
    category: "GENERAL",
    description: "",
    defaultCoins: 0,
  };

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 } }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            color: theme.palette.customText.primary.p1.active,
          }}
        >
          Event Types Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateModalOpen(true)}
          size="medium"
        >
          Create Event Type
        </Button>
      </Box>

      {state === State.loading && eventTypes.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* System Event Types (Read-only) */}
          {systemEventTypes.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  System Event Types
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  These event types are system-defined. You can update the description and default coins, but they cannot be deleted.
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: "25%" }}>Event Type Name</TableCell>
                        <TableCell sx={{ width: "40%" }}>Description</TableCell>
                        <TableCell sx={{ width: "15%" }}>Default Coins</TableCell>
                        <TableCell align="right" sx={{ width: "20%" }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {systemEventTypes.map((eventType) => (
                        <TableRow key={eventType.eventTypeName}>
                          <TableCell sx={{ width: "25%" }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {eventType.eventTypeName}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: "40%" }}>
                            <Typography variant="body2" color="text.secondary">
                              {eventType.description || "-"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: "15%" }}>
                            <Typography variant="body2">{eventType.defaultCoins}</Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ width: "20%" }}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Edit Event Type" arrow>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEdit(eventType)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* General Event Types (Editable) */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                General Event Types
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Manage custom event types. You can create, update, or delete these event types.
              </Typography>
              {generalEventTypes.length === 0 ? (
                <Box sx={{ py: 6 }}>
                  <StateWithImage
                    message="No general event types found. Create your first event type!"
                    imageUrl={NoDataImage}
                  />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: "25%" }}>Event Type Name</TableCell>
                        <TableCell sx={{ width: "40%" }}>Description</TableCell>
                        <TableCell sx={{ width: "15%" }}>Default Coins</TableCell>
                        <TableCell align="right" sx={{ width: "20%" }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {generalEventTypes.map((eventType) => (
                        <TableRow key={eventType.eventTypeName}>
                          <TableCell sx={{ width: "25%" }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {eventType.eventTypeName}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: "40%" }}>
                            <Typography variant="body2" color="text.secondary">
                              {eventType.description || "-"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: "15%" }}>
                            <Typography variant="body2">{eventType.defaultCoins}</Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ width: "20%" }}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Edit Event Type" arrow>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEdit(eventType)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Event Type" arrow>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDelete(eventType)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
          <Box sx={{ height: 36 }} />
        </>
      )}

      {/* Create Modal */}
      <Dialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Formik
          initialValues={initialCreateValues}
          validationSchema={validationSchema}
          onSubmit={handleCreate}
        >
          {({ values, errors, touched, handleChange, handleBlur }) => (
            <Form>
              <DialogTitle>Create Event Type</DialogTitle>
              <DialogContent>
                <TextField
                  fullWidth
                  label="Event Type Name"
                  name="eventTypeName"
                  value={values.eventTypeName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.eventTypeName && !!errors.eventTypeName}
                  helperText={touched.eventTypeName && errors.eventTypeName}
                  sx={{ mb: 2, mt: 1 }}
                  placeholder="e.g., Interview, Voice Cut"
                />
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={values.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.description && !!errors.description}
                  helperText={touched.description && errors.description}
                  multiline
                  rows={3}
                  sx={{ mb: 2 }}
                  placeholder="Optional: Add a description for this event type"
                />
                <TextField
                  fullWidth
                  label="Default Coins"
                  name="defaultCoins"
                  type="number"
                  value={values.defaultCoins}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.defaultCoins && !!errors.defaultCoins}
                  helperText={
                    touched.defaultCoins && errors.defaultCoins
                      ? errors.defaultCoins
                      : "Default number of coins awarded for this event type"
                  }
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={state === State.loading}>
                  {state === State.loading ? <CircularProgress size={20} /> : "Create"}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      {/* Edit Modal */}
      <Dialog
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingEventType(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        {editingEventType && (
          <Formik
            initialValues={{
              eventTypeName: editingEventType.eventTypeName,
              category: editingEventType.category as "GENERAL",
              description: editingEventType.description || "",
              defaultCoins: editingEventType.defaultCoins,
            }}
            validationSchema={validationSchema}
            onSubmit={handleUpdate}
            enableReinitialize
          >
            {({ values, errors, touched, handleChange, handleBlur }) => (
              <Form>
                <DialogTitle>Edit Event Type</DialogTitle>
                <DialogContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
                    Note: Only description and default coins can be updated.
                  </Typography>
                  <TextField
                    fullWidth
                    label="Event Type Name"
                    name="eventTypeName"
                    value={values.eventTypeName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.eventTypeName && !!errors.eventTypeName}
                    helperText={touched.eventTypeName && errors.eventTypeName}
                    disabled
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    value={values.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.description && !!errors.description}
                    helperText={touched.description && errors.description}
                    multiline
                    rows={3}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Default Coins"
                    name="defaultCoins"
                    type="number"
                    value={values.defaultCoins}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.defaultCoins && !!errors.defaultCoins}
                    helperText={
                      touched.defaultCoins && errors.defaultCoins
                        ? errors.defaultCoins
                        : "Default number of coins awarded for this event type"
                    }
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingEventType(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" disabled={state === State.loading}>
                    {state === State.loading ? <CircularProgress size={20} /> : "Update"}
                  </Button>
                </DialogActions>
              </Form>
            )}
          </Formik>
        )}
      </Dialog>
    </Container>
  );
}

