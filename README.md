## Learning objectives

In this tutorial, you will:

1. Learn how to create a simple Node.js application.
2. Connect the application to a chatbot using the IBM Watson Assistant APIs.
3. Test and run the application locally.
4. Deploy the application on IBM Cloud as a Cloud Foundry application.

Here is a demo of the final application:

![Chatbot demo]('https://www.loom.com/share/f694d3a2c8d14864bc68b572c5836365')

## Prerequisites

1. Sign up for an [IBM Cloud account](https://www.ibm.com/account/reg/us-en/signup?formid=urx-42793&eventid=cfc-2020?cm_mmc=OSocial_Blog-_-Audience+Developer_Developer+Conversation-_-WW_WW-_-cfc-2020-ghub-starterkit-communication_ov75914&cm_mmca1=000039JL&cm_mmca2=10008917).
 You will need your assistant credentials (Assistant ID, Assistant URL and Api Key) as explained in the previous tutorial.

    ![Watson Assistant Photo7 ](readme_images/WA-Photo7.png)

## Estimated **time**

This tutorial will take you about 30 minutes to complete.

## Steps

The following steps assume that you have created an assistant, imported the COVID skills, and have the assistant credentials available.

## Configuring the application

1. Clone the repository.

2. Copy the *.example.env* file to a file called *.env*

    ```
    cp .example.env .env
    ```

3. Open the *.env* file and change the credentials as follows:

    - ASSISTANT_URL: service endpoint for Watson Assistant based on the region your service is created in. You can get the region specific service endpoints from the [documentation](https://cloud.ibm.com/apidocs/assistant/assistant-v2). The URLs are as follows at the time these instructions were written:
    
    |Region|Service Endpoint|
    |------|----------------|
    |Dallas|https://api.us-south.assistant.watson.cloud.ibm.com|
    |Washington, DC|https://api.us-east.assistant.watson.cloud.ibm.com|
    |Frankfurt|https://api.eu-de.assistant.watson.cloud.ibm.com|
    |Sydney|https://api.au-syd.assistant.watson.cloud.ibm.com|
    |Tokyo|https://api.jp-tok.assistant.watson.cloud.ibm.com|
    |London|https://api.eu-gb.assistant.watson.cloud.ibm.com|
    - ASSISTANT_ID: `Assistant ID` as shown in the screenshot above.
    - ASSISTANT_IAM_APIKEY: `Api Key` as shown in the screenshot above.
    - ASSISTANT_IAM_URL: `Assistant URL` as shown in the screenshot above.

    That's it! You are now ready to run your application. 

## Running locally

1. Install the dependencies:

    ```
    npm install
    ```

1. Run the application:

    ```
    npm start
    ```

1. View the application in a browser at `localhost:3000`.



