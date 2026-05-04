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

import React, { useContext, useState } from "react";

import { IconButton, Stack, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import DoneIcon from "@mui/icons-material/Done";
import DeleteIcon from "@mui/icons-material/Delete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import LoadingButton from "@mui/lab/LoadingButton";
import { ConfirmationType } from "@utils/types";
import { JSX } from "react/jsx-runtime";

type InputObj = {
  label: string;
  mandatory: boolean;
  type: "textarea" | "date";
};

type UseConfirmationDialogShowReturnType = {
  show: boolean;
  setShow: (value: boolean) => void;
  onHide: () => void;
};

const useDialogShow = (): UseConfirmationDialogShowReturnType => {
  const [show, setShow] = useState(false);

  const handleOnHide: () => void = () => {
    setShow(false);
  };

  return {
    show,
    setShow,
    onHide: handleOnHide,
  };
};

type ConfirmationDialogContextType = {
  showConfirmation: (
    title: string,
    message: string | JSX.Element,
    type: ConfirmationType,
    action: () => void,
    okText?: string,
    cancelText?: string,
    inputObj?: InputObj
  ) => void;
};

type ConfirmationModalContextProviderProps = {
  children: React.ReactNode;
};

const ConfirmationModalContext =
  React.createContext<ConfirmationDialogContextType>(
    {} as ConfirmationDialogContextType
  );

const ConfirmationDialogContextProvider: React.FC<
  ConfirmationModalContextProviderProps
> = (props) => {
  const { setShow, show, onHide } = useDialogShow();

  const [comment, setComment] = React.useState("");

  const [content, setContent] = useState<{
    title: string;
    message: string | JSX.Element;
    type: ConfirmationType;
    action: (value?: string) => void;
    okText?: string;
    cancelText?: string;
    inputObj?: InputObj;
  }>({
    title: "",
    message: "",
    type: ConfirmationType.send,
    action: () => {},
  });

  // Show dialog only when content has a title (is properly set)
  React.useEffect(() => {
    if (content.title) {
      setShow(true);
    } else {
      // Hide dialog when content is reset
      setShow(false);
    }
  }, [content.title]);

  const handleShow = (
    title: string,
    message: string | JSX.Element,
    type: ConfirmationType,
    action: (value?: string) => void,
    okText?: string,
    cancelText?: string,
    inputObj?: InputObj
  ) => {
    // Reset show state first to ensure clean state
    setShow(false);
    // Set content - useEffect will handle showing the dialog
    setContent({
      title,
      message,
      type,
      action,
      okText,
      cancelText,
      inputObj,
    });
  };

  const dialogContext: ConfirmationDialogContextType = {
    showConfirmation: handleShow,
  };

  const handleOk = (value?: string) => {
    if (content && content.action) {
      content.action(value);
    }
    onHide();
    // Reset content after a brief delay to ensure dialog closes first
    setTimeout(() => {
      Reset();
    }, 100);
  };

  const handleCancel = () => {
    onHide();
    // Reset content after a brief delay to ensure dialog closes first
    setTimeout(() => {
      Reset();
    }, 100);
  };

  const Reset = () => {
    setContent({
      title: "",
      message: "",
      type: ConfirmationType.update,
      action: () => {},
      okText: undefined,
      cancelText: undefined,
    });

    setComment("");
  };

  const onChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setComment(event.target.value);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ConfirmationModalContext.Provider value={dialogContext}>
        {props.children}
        {content && content.title && (
          <Dialog
            open={show}
            sx={{
              ".MuiDialog-paper": {
                maxWidth: 350,
                borderRadius: 3,
              },
              backdropFilter: "blur(10px)",
            }}
          >
            <DialogTitle
              variant="h5"
              sx={{
                fontWeight: "bold",
                borderBottom: 1,
                borderColor: "divider",
                mb: 1,
                pd: 0,
              }}
            >
              {content?.title}
            </DialogTitle>
            <IconButton
              aria-label="close"
              onClick={handleCancel}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
            <DialogContent sx={{ p: 0, m: 0, paddingX: 2 }}>
              <DialogContentText variant="body2">
                {content?.message}
              </DialogContentText>
            </DialogContent>
            {content.inputObj && (
              <TextField
                sx={{ marginX: 2, mt: 2, maxWidth: 350 }}
                value={comment}
                label={content.inputObj?.label}
                type="text"
                size="small"
                multiline
                rows={2}
                maxRows={6}
                onChange={onChange}
              />
            )}

            <DialogActions sx={{ pb: 2, pt: 0, mt: 0, paddingX: 2 }}>
              <Stack flexDirection={"row"} sx={{ mt: 1 }} gap={1}>
                {/* Cancel button */}
                <Button
                  sx={{
                    borderRadius: 2,
                  }}
                  onClick={handleCancel}
                  variant="outlined"
                  size="small"
                >
                  {content?.cancelText ? content.cancelText : "No"}
                </Button>

                {/* Ok button */}
                <LoadingButton
                  type="submit"
                  sx={{
                    borderRadius: 2,
                    boxShadow: "none",
                    border: 0.5,
                    borderColor: "divider",
                  }}
                  variant="contained"
                  size="small"
                  disabled={content?.inputObj?.mandatory && comment === ""}
                  onClick={() =>
                    content?.inputObj ? handleOk(comment) : handleOk()
                  }
                  loadingPosition="start"
                  startIcon={
                    content.type === ConfirmationType.update ? (
                      <SaveAltIcon />
                    ) : content.type === ConfirmationType.send ? (
                      <SendIcon />
                    ) : content.type === ConfirmationType.upload ? (
                      <SaveAltIcon />
                    ) : content.type === ConfirmationType.delete ? (
                      <DeleteIcon />
                    ) : (
                      <DoneIcon />
                    )
                  }
                >
                  {content?.okText ? content.okText : "Yes"}
                </LoadingButton>
              </Stack>
            </DialogActions>
          </Dialog>
        )}
      </ConfirmationModalContext.Provider>
    </LocalizationProvider>
  );
};

const useConfirmationModalContext = (): ConfirmationDialogContextType =>
  useContext(ConfirmationModalContext);

export { useDialogShow, useConfirmationModalContext };

export default ConfirmationDialogContextProvider;
