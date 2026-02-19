pipeline {
    agent any

    environment {
        DOCKERHUB_USER = "ketanayatti"
        APP_SERVER = "172.31.28.8"
        DEPLOY_PATH = "/home/ubuntu/Communiatec"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Server Image') {
            steps {
                script {
                    def tag = (env.BRANCH_NAME == "main") ? "latest" : "develop-${env.BUILD_NUMBER}"
                    sh "docker build -t $DOCKERHUB_USER/communiatec-server:${tag} ./Server"
                }
            }
        }

        stage('Build Client Image') {
            steps {
                script {
                    def tag = (env.BRANCH_NAME == "main") ? "latest" : "develop-${env.BUILD_NUMBER}"
                    sh """
                    docker build \
                      --build-arg VITE_API_URL=http://server:4000 \
                      --build-arg VITE_APP_SERVER_URL=http://server:4000 \
                      -t $DOCKERHUB_USER/communiatec-client:${tag} ./Client
                    """
                }
            }
        }

        stage('Push Images') {
            steps {
                script {
                    def tag = (env.BRANCH_NAME == "main") ? "latest" : "develop-${env.BUILD_NUMBER}"

                    withCredentials([usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'USER',
                        passwordVariable: 'PASS'
                    )]) {

                        sh """
                        echo $PASS | docker login -u $USER --password-stdin
                        docker push $DOCKERHUB_USER/communiatec-server:${tag}
                        docker push $DOCKERHUB_USER/communiatec-client:${tag}
                        docker logout
                        """
                    }
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                sshagent(['app-server-ssh']) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ubuntu@${APP_SERVER} '
                        cd ${DEPLOY_PATH} &&
                        docker compose pull &&
                        docker compose up -d
                    '
                    """
                }
            }
        }
    }
}
