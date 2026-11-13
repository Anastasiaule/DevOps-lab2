pipeline {
    agent any

    environment {
        PYTHON = 'C:/Users/Анастасия/AppData/Local/Programs/Python/Python314/python.exe'
        PATH = "C:\\Users\\Анастасия\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;${env.PATH}"
        DOCKER_CONFIG = 'C:/Users/Анастасия/.docker'
        // репозиторий на Docker Hub: в нём два образа, которые различаются тегами (api-... и web-...)
        IMAGE_REPO = 'anastasiaulele/nastenkalibrary'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build images') {
            steps {
                bat 'docker compose build'
            }
        }

        stage('Deploy') {
            when { branch 'main' }
            steps {
                bat 'docker compose up -d --remove-orphans'
                retry(10) {
                    sleep time: 3, unit: 'SECONDS'
                    bat 'curl.exe -fsS http://localhost:8081/health'
                }
                bat 'docker compose ps'
                echo 'Application deployed in containers: http://localhost:8081'
            }
        }

        // публикация образов в Docker Hub: только для main и только после успешного деплоя
        stage('Push to Docker Hub') {
            when { branch 'main' }
            steps {
                // логин и токен хранятся в Jenkins (Credentials, идентификатор dockerhub)
                withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKERHUB_USER', passwordVariable: 'DOCKERHUB_TOKEN')]) {
                    bat 'echo %DOCKERHUB_TOKEN%| docker login -u %DOCKERHUB_USER% --password-stdin'
                }
                // присваиваем образам имена репозитория: тег с номером сборки и тег latest
                bat '''
                    docker tag library-api %IMAGE_REPO%:api-%BUILD_NUMBER% || exit /b 1
                    docker tag library-api %IMAGE_REPO%:api-latest || exit /b 1
                    docker tag library-web %IMAGE_REPO%:web-%BUILD_NUMBER% || exit /b 1
                    docker tag library-web %IMAGE_REPO%:web-latest || exit /b 1
                    docker push %IMAGE_REPO%:api-%BUILD_NUMBER% || exit /b 1
                    docker push %IMAGE_REPO%:api-latest || exit /b 1
                    docker push %IMAGE_REPO%:web-%BUILD_NUMBER% || exit /b 1
                    docker push %IMAGE_REPO%:web-latest || exit /b 1
                '''
                bat(script: 'docker logout', returnStatus: true)
                echo "Images published: https://hub.docker.com/r/${env.IMAGE_REPO}/tags"
            }
        }
    }

    post {
        success {
            echo 'CI pipeline completed successfully'
        }
        failure {
            echo 'CI pipeline failed'
        }
    }
}
