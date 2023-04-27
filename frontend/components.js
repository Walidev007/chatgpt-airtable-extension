import React, { useState } from "react";
import { globalConfig } from "@airtable/blocks";
import {
  Box,
  Button,
  FieldPickerSynced,
  Heading,
  InputSynced,
  ProgressBar,
  useGlobalConfig,
  Text,
  useRecords,
  SelectSynced,
} from "@airtable/blocks/ui";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import Collapse from "react-bootstrap/Collapse";
import Badge from 'react-bootstrap/Badge';
import Alert from 'react-bootstrap/Alert';

const DAVINCI = "text-davinci-003";

async function queryOpenAi(prompt) {

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers":
        '"Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers',
      Authorization: `Bearer ${globalConfig.get("apiKey")}`,
      withCredentials: true,
    },
    body: JSON.stringify({
      model: globalConfig.get("model") || DAVINCI,
      prompt: `${String(globalConfig.get("prompt"))} : ${prompt}`,
      max_tokens: globalConfig.get("maxTokens") || 1504,
      temperature: globalConfig.get("temperature") || 0,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    }),
  };

  try {
    const response = await fetch(
      "https://api.openai.com/v1/completions",
      requestOptions
    );
    const data = await response.json();
    return data.choices[0].text.trim();
  } catch (e) {
    return e.message;
  }
}

function SettingsInput({ name, label }) {
  return (
    <Box paddingY="2">
      <Heading size="small" paddingBottom="1">
        {name}
      </Heading>
      <InputSynced globalConfigKey={name} placeholder={label} width="100%" />
    </Box>
  );
}

export const globalOptions = {
  apiKey: "sk-...{48 alphanumeric symbols}...",
  prompt: "Translate...",
};

export function SettingsContainer() {
  const options = Object.keys(globalOptions).map((k) => {
    return <SettingsInput key={k} name={k} label={globalOptions[k]} />;
  });
  return <Box padding="3">{options}</Box>;
}

export async function processRecords(
  table,
  records,
  totalRecords,
  setProgressBarProgress,
  setProgressText,
  setInProgress
) {
  setProgressBarProgress(0);
  setInProgress(true);
  let i = 0,
    MAX_RECORDS_PER_GET = 10;
  while (totalRecords && i < totalRecords) {
    const batchSize = MAX_RECORDS_PER_GET;
    let batchRecords = records.slice(i, i + batchSize);
    let recs = await Promise.all(
      batchRecords.map(async (record) => {
        return {
          id: record.id,
          fields: {
            [globalConfig.get("fieldTo")]: await queryOpenAi(
              record.getCellValueAsString(globalConfig.get("fieldFrom"))
            ),
          },
        };
      })
    );
    
    await table.updateRecordsAsync(recs);
    let v = i + batchRecords.length;
    i += batchSize;
    let p = v / totalRecords;
    setProgressBarProgress(p);
    setProgressText(`${v} of ${totalRecords} (${parseInt(p * 100)}%)`);
  }
  setInProgress(false);
}

export function MainContainer({ table, view }) {
  const [isVisible, initHs] = useState(false);
  const globalConfig = useGlobalConfig();
  let [progressBarProgress, setProgressBarProgress] = useState(0);
  let [progressText, setProgressText] = useState("in progress...");
  let [inProgress, setInProgress] = useState(false);

  let fieldFrom = table.getFieldByIdIfExists(globalConfig.get("fieldFrom"));
  let fieldTo = table.getFieldByIdIfExists(globalConfig.get("fieldTo"));

  let setupWarning =
    !fieldFrom ||
    !fieldTo ||
    !globalConfig.get("prompt") ||
    !globalConfig.get("model") ||
    !globalConfig.get("maxTokens");
  let apiKeyWarning = !globalConfig.get("apiKey");

  let records = useRecords(view);

  let totalRecords = records && records.length;
  const invokeCollapse = () => {
    return initHs(!isVisible);
  };
  const models = ["text-davinci-003"].map((i) => {
    return { label: i, value: i };
  });
  const totalTokenOpts = globalConfig.get("model") === DAVINCI ? 126 : 65,
    totalTempOpts = 21;
  const tokens = [...Array(totalTokenOpts).keys()].map((i) => {
    const v =
      ((globalConfig.get("model") === DAVINCI ? 4000 : 2048) * i) /
      (totalTokenOpts - 1);
    return { label: v, value: v };
  });
  const temps = [...Array(totalTempOpts).keys()].map((i) => {
    const v = (2.0 * i) / (totalTempOpts - 1);
    return { label: v, value: v };
  });

  return (
    <Box padding="3">
      <Box marginBottom="3" borderBottom="thick">
        <Heading size="large">
          <Text className="h6" textColor="light" as="span">
            Table:{" "}
            <Badge pill bg="primary">
                {table.name}
            </Badge>
          </Text>
          <Text className="h6" textColor="darkred" as="span">
                {" "} › {" "}
          </Text>
          <Text className="h6" textColor="light" as="span">
            View:{" "}
            <Badge pill bg="success">
                {view.name}
            </Badge>
          </Text>
        </Heading>
      </Box>

      <Box marginBottom="3" borderBottom="thick">
        <p className="h6 mb-2">
          This Airtable extension can get and save OpenAI ChatGPT responses to
          selected records
        </p>
        <Button
          marginBottom="3"
          onClick={invokeCollapse}
          size={"large"}
          width={"calc(100%)"}
          icon={"settings"}
          display={"flexShrink"}
        >
          Adjust configs ChatGPT
        </Button>

        <Collapse in={isVisible}>
          <Box paddingBottom="3" paddingTop="3" id="collapsePanel">
            <Box paddingBottom="3">
              <Heading size="xsmall" textColor="light">
                Model 
              </Heading>
              <SelectSynced
                options={models}
                globalConfigKey="model"
                placeholder="Max Tokens"
                width="100%"
              />
            </Box>
            <Box paddingBottom="3" display="flex">
              <Box width="100%">
                <Heading size="xsmall" textColor="light">
                  Max Tokens 
                </Heading>
                <SelectSynced
                  options={tokens}
                  globalConfigKey="maxTokens"
                  placeholder="Max Tokens"
                />
                <Heading size="small" textColor="light">
                    <Text textColor="light" as="span">
                        Default value = 1024
                    </Text>
                </Heading>
              </Box>
              <Box width="100%" marginLeft="2%">
                <Heading size="xsmall" textColor="light">
                  Temperature
                </Heading>
                <SelectSynced
                  options={temps}
                  globalConfigKey="temperature"
                  placeholder="Temperature"
                />
                <Heading size="small" textColor="light">
                    <Text textColor="light" as="span">
                        Default value = 0
                    </Text>
                </Heading>
              </Box>
            </Box>
            <Alert variant="secondary">
                <Text className="h6">Temperature</Text>
                <Text size="small">
                    The lower the temperature, the more likely GPT-3 will choose words with a higher probability of occurrence. The temperature determines how greedy the generative model is.
                </Text>
                <Text className="h6">max_tokens</Text>
                <Text size="small">
                    You're allowed to have up to 2048 tokens or about 1500 words in your prompt when you run, and that includes any generated text.
                </Text>
            </Alert>
          </Box>
        </Collapse>
      </Box>

      <Box paddingBottom="3" display="flex">
        <Box width="49%">
          <Heading size="small" textColor="light">
            <Text textColor="light" as="span">
              From 
            </Text>
          </Heading>
          <FieldPickerSynced table={table} globalConfigKey="fieldFrom" />
        </Box>
        <Box width="49%" marginLeft="2%">
          <Heading size="small" textColor="light">
            <Text textColor="light" as="span">
              Save To
            </Text>
          </Heading>
          <FieldPickerSynced
            table={table}
            globalConfigKey="fieldTo"
            allowedTypes={[
              "number",
              "singleLineText",
              "multilineText",
              "richText",
            ]}
          />
        </Box>
      </Box>
      <Box position={"fixed"} bottom={3} width={"100%"} display={"flex"}>
        <Button
          disabled={
            inProgress || !totalRecords || setupWarning || apiKeyWarning
          }
          size="large"
          width={"calc(100% - 32px)"}
          icon={
            inProgress
              ? "overflow"
              : setupWarning || apiKeyWarning
              ? "warning"
              : "paragraph"
          }
          variant={inProgress ? "default" : "primary"}
          onClick={() =>
            processRecords(
              table,
              records,
              totalRecords,
              setProgressBarProgress,
              setProgressText,
              setInProgress
            )
          }
        >
          {inProgress ? (
            <Box>
              <Text>{progressText}</Text>
              <ProgressBar progress={progressBarProgress} barColor="#ff9900" />
            </Box>
          ) : apiKeyWarning ? (
            "Set up apiKey in Settings"
          ) : setupWarning ? (
            "Set up all params"
          ) : (
            `Process ${totalRecords || "NaN"} record${
              totalRecords && totalRecords > 1 ? "s" : ""
            }`
          )}
        </Button>
      </Box>
    </Box>
  );
}
