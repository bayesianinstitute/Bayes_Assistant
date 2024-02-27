# Lawyer Assistant

## Configuration

<details>
<summary><strong>AWS EC2 Instance Setup</strong></summary>

1. **Create an AWS Account:**

   - If you don't have an AWS account, sign up for one at [AWS Console](https://aws.amazon.com/).

2. **Access AWS Console:**

   - Log in to the [AWS Management Console](https://aws.amazon.com/console/).

3. **Navigate to EC2 Dashboard:**

   - In the AWS Management Console, navigate to the "EC2 Dashboard."

4. **Launch an Instance:**

   - Click on "Launch Instance" to create a new EC2 instance.

5. **Choose an Amazon Machine Image (AMI):**

   - Select an Ubuntu Server AMI (choose the latest Ubuntu LTS version).

6. **Choose an Instance Type:**

   - Select the "t2.medium" instance type from the list.

7. **Configure Instance:**

   - In the "Configure Instance Details" section, you can leave most settings as default.
   - Optionally, you can configure details like IAM role, user data, etc.

8. **Add Storage:**

   - In the "Add Storage" section, set the storage size to 20 GB.

9. **Add Tags (Optional):**

   - Add any tags you want to help identify your instance.

10. **Configure Security Group:**

- - If there isn't an existing rule for your application, add a new rule to allow TCP traffic for your application's port (e.g., 5000).
- Type: Custom TCP Rule
- Add Port : 8080 (or the port your application uses)
- Source: 0.0.0.0/0 (Allow traffic from anywhere)
-

11. **Review and Launch:**

- Review your instance configuration and click "Launch."

12. **Create a Key Pair:**

- Choose an existing key pair or create a new one. This key pair is essential for SSH access to your instance.

13. **Launch Instance:**

- Click "Launch Instance."

14. **Access Your EC2 Instance:**

- Once the instance is running, use the generated key pair to SSH into your instance. Example:
`bash
     ssh -i /path/to/your/key.pem ubuntu@your-instance-ip
     `
</details>

<details>
<summary><strong>MongoDB Atlas Setup</strong></summary>

1. **Create MongoDB Atlas Account:**

   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up for an account.

2. **Create a New Cluster:**

   - Once logged in, click on "Build a Cluster" to create a new MongoDB cluster.

3. **Configure Cluster:**

   - Follow the on-screen instructions to configure your cluster. Choose your preferred cloud provider, region, and other settings.

4. **Database Access:**

   - In the left sidebar, navigate to "Database Access" under the Security section. Create a new database user and remember the credentials.

5. **Network Access (Whitelist IP Address):**

   - In the left sidebar, navigate to "Network Access" under the Security section.
   - Click on "Add IP Address" and add your current IP address to allow your local development environment to connect to the database.
   - Optionally, you can set "0.0.0.0/0" to allow connections from any IP address , but this is less secure or set you specfic ip.

6. **Connect to Your Cluster:**
   - In the left sidebar, click on "Clusters" and then on your cluster's "Connect" button.
   - Choose "Connect Your Application" and copy the connection string.

</details>

## Prerequisites

- get your api key from https://openai.com/api/

Make sure you have installed all of the following prerequisites on your development machine:

- Node Js & Npm [Download and Install](https://nodejs.org/en)
- MongoDB [Download and Install](https://www.mongodb.com/docs/manual/installation/)
- Git [Download and Install](https://git-scm.com/downloads)

## Node.js and npm Versions

This project is developed and tested using the following versions of Node.js and npm:

- Node.js: 18.16.1
- npm: 9.51.1

<details>
<summary><strong>Installation Node js</strong></summary>

1. **Install NVM as your regular user:**

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
   ```

2. **Load NVM into the shell:**

   ```bash
   source ~/.nvm/nvm.sh
   ```

3. **Install the desired Node.js version:**
   ```bash
   nvm install 18.16.1
   ```

</details>

### Install pm2 package

npm then install pm2 for production monitoring

```bash
npm install pm2 -g
```

## Environment Variables

<details>
<summary><strong>Server env</strong></summary>

To run this project, you will need to add the following environment variables to your .env file in server directory

`PORT` = `5000`

`MONGO_URL`

`SITE_URL`

`JWT_PRIVATE_KEY`

`OPENAI_API_KEY`

`OPENAI_ASSISTANT_ID`

`OPENAI_ORGANIZATION`

`MAIL_EMAIL`

`MAIL_SECRET`

`MAIL_SERVICE`

`MONITOR_EMAIL`

`CC_EMAIL`

`RECAPTCHA_SECRET_KEY`

</details>
<details>
<summary><strong>Client env</strong></summary>

To run this project, you will need to add the following environment variables to your .env.local file in client directory

`VITE_CLIENT_ID` #Google login api client id
`VITE_SITE_KEY` # Google RECAPTCHA_SITE_KEY

</details>

## Run Locally

Clone the project

```bash
  git clone https://github.com/bayesianinstitute/Bayes_Assistant.git
```

### Checkout Branch

#### For Data Science

```bash
   git checkout main
```

#### Or

#### For Lawyer

```bash
   git checkout lawyer
```

### To Start BackEnd

Go to the server directory

```bash
  cd Bayes_Assistant/server
```

Install dependencies

```bash
  npm install
```

Start

```bash
   pm2 start app.js
```

### To Start FrontEnd

#### Go to the client directory

```bash
  cd Bayes_Assistant/client
```

#### Install dependencies

```bash
  npm install
```

#### Build

```bash
   npm run build
```

#### Send dist folder in server

```bash
   cp -r dist ../server
```

bind port Allow bind to 80:

```bash
sudo setcap 'cap_net_bind_service=+ep' /home/ubuntu/.nvm/versions/node/v18.16.1/bin/node
```

Start

```bash
   pm2 start npm --name "client" -- run preview
```
